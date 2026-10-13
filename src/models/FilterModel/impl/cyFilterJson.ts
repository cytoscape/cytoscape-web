import { z } from 'zod'

import { logModel } from '../../../debug'
import {
  ChainTransformerId,
  ColumnFilterCriterion,
  ColumnFilterNode,
  ColumnFilterTarget,
  CompositeFilterNode,
  DegreeEdgeType,
  DegreeFilterNode,
  FilterNode,
  FilterPredicate,
  FilterTypeId,
  MatchType,
  NamedFilter,
  NumberRangeCriterion,
  TopologyFilterNode,
} from '../FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
  uniqueFilterName,
} from './filterTreeImpl'

/**
 * Reading and writing Cytoscape Desktop filter files (Filter panel ›
 * Export / Import filters). See `docs/specifications/FILTER_SPECIFICATION.md`.
 *
 * A file is a JSON array of named filters:
 *
 *   [{ "name": ..., "transformers": [{ "id": ..., "parameters": {...},
 *                                      "transformers": [...] }] }]
 *
 * Files are untrusted input: their size, nesting and condition count are
 * bounded before anything is parsed, and parameters are checked against a
 * whitelist per condition type, so unknown keys (`__proto__` included) never
 * reach the model.
 */

/** Largest file accepted, in UTF-16 code units of its text */
export const MAX_FILE_LENGTH = 5_000_000

/** Deepest nesting of conditions accepted */
export const MAX_FILTER_DEPTH = 32

/** Most conditions accepted in one file */
export const MAX_FILTER_CONDITIONS = 10_000

const CD_ID_PREFIX = 'org.cytoscape.'

/**
 * Why an entry of a filter file was not imported
 */
export const SkipReason = {
  // A Chain tab entry: CW has no chains
  CHAIN: 'chain',
  // A condition type CW does not know, e.g. one from a Cytoscape app
  UNKNOWN_ID: 'unknown-id',
  // Malformed: a missing name, a parameter of the wrong type, ...
  INVALID: 'invalid',
  // Holds no condition
  NO_FILTER: 'no-filter',
} as const

export type SkipReason = (typeof SkipReason)[keyof typeof SkipReason]

export interface SkippedFilterEntry {
  // Position of the entry in the file
  readonly index: number
  readonly name?: string
  readonly reason: SkipReason
  readonly detail: string
}

export type CyFilterParseResult =
  | {
      readonly success: true
      readonly filters: NamedFilter[]
      readonly skipped: SkippedFilterEntry[]
    }
  | { readonly success: false; readonly error: string }

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

const PredicateSchema = z.enum([
  FilterPredicate.IS,
  FilterPredicate.IS_NOT,
  FilterPredicate.GREATER_THAN,
  FilterPredicate.GREATER_THAN_OR_EQUAL,
  FilterPredicate.LESS_THAN,
  FilterPredicate.LESS_THAN_OR_EQUAL,
  FilterPredicate.BETWEEN,
  FilterPredicate.IS_NOT_BETWEEN,
  FilterPredicate.CONTAINS,
  FilterPredicate.DOES_NOT_CONTAIN,
  FilterPredicate.REGEX,
])

const MatchTypeSchema = z.enum([MatchType.ALL, MatchType.ANY])

// Two leading numbers make a range; Cytoscape Desktop ignores the rest
const toRange = (list: readonly unknown[]): NumberRangeCriterion | undefined =>
  list.length >= 2 && typeof list[0] === 'number' && typeof list[1] === 'number'
    ? [list[0], list[1]]
    : undefined

// A list that is not a range sets no criterion, as in Cytoscape Desktop
const ColumnCriterionSchema = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.null()])
  .transform(
    (value): ColumnFilterCriterion =>
      Array.isArray(value) ? (toRange(value) ?? null) : value,
  )

const ColumnParametersSchema = z.object({
  predicate: PredicateSchema.nullish(),
  criterion: ColumnCriterionSchema.optional(),
  caseSensitive: z.boolean().optional(),
  type: z
    .enum([
      ColumnFilterTarget.NODES,
      ColumnFilterTarget.EDGES,
      ColumnFilterTarget.NODES_AND_EDGES,
    ])
    .optional(),
  anyMatch: z.boolean().optional(),
  columnName: z.string().nullish(),
})

// A number n is the range [n, n]; any other list is an error
const DegreeCriterionSchema = z
  .union([z.number(), z.array(z.unknown()), z.null()])
  .transform((value, ctx): NumberRangeCriterion | null => {
    if (value === null) return null
    if (typeof value === 'number') return [value, value]
    const range = toRange(value)
    if (range === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected a number or two numbers',
      })
      return z.NEVER
    }
    return range
  })

const DegreeParametersSchema = z.object({
  predicate: PredicateSchema.nullish(),
  criterion: DegreeCriterionSchema.optional(),
  edgeType: z
    .enum([
      DegreeEdgeType.ANY,
      DegreeEdgeType.INCOMING,
      DegreeEdgeType.OUTGOING,
    ])
    .optional(),
})

const TopologyParametersSchema = z.object({
  predicate: PredicateSchema.nullish(),
  distance: z.number().int().nullish(),
  threshold: z.number().int().nullish(),
  type: MatchTypeSchema.optional(),
})

const CompositeParametersSchema = z.object({
  type: MatchTypeSchema.optional(),
})

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

type Parsed<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false
      readonly reason: SkipReason
      readonly detail: string
    }

const fail = <T>(reason: SkipReason, detail: string): Parsed<T> => ({
  ok: false,
  reason,
  detail,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readOwn = (record: Record<string, unknown>, key: string): unknown =>
  Object.hasOwn(record, key) ? record[key] : undefined

/**
 * The full id of a transformer: a short id without a dot gets Cytoscape's
 * prefix (`ColumnFilter` → `org.cytoscape.ColumnFilter`)
 */
export const toFullTransformerId = (id: string): string =>
  id.includes('.') ? id : `${CD_ID_PREFIX}${id}`

const CHAIN_IDS: ReadonlySet<string> = new Set(
  Object.values(ChainTransformerId),
)
const FILTER_IDS: ReadonlySet<string> = new Set(Object.values(FilterTypeId))

const describeIssues = (error: z.ZodError, where: string): string =>
  error.issues
    .map(
      (issue) =>
        `${where}${issue.path.length > 0 ? `.${issue.path.join('.')}` : ''}: ${issue.message}`,
    )
    .join('; ')

const parseParameters = <S extends z.ZodTypeAny>(
  schema: S,
  raw: Record<string, unknown>,
  where: string,
): Parsed<z.output<S>> => {
  // Cytoscape Desktop requires "parameters"; CW takes defaults instead
  const parameters = readOwn(raw, 'parameters') ?? {}
  const result = schema.safeParse(parameters)
  return result.success
    ? { ok: true, value: result.data }
    : fail(
        SkipReason.INVALID,
        describeIssues(result.error, `${where}.parameters`),
      )
}

const parseChildren = (
  raw: Record<string, unknown>,
  where: string,
): Parsed<FilterNode[]> => {
  // Missing on a topology condition from Cytoscape 3.2 and earlier
  const transformers = readOwn(raw, 'transformers') ?? []
  if (!Array.isArray(transformers)) {
    return fail(SkipReason.INVALID, `${where}.transformers: Expected an array`)
  }
  const children: FilterNode[] = []
  for (let i = 0; i < transformers.length; i++) {
    const child = parseCondition(transformers[i], `${where}.transformers.${i}`)
    if (!child.ok) return child
    children.push(child.value)
  }
  return { ok: true, value: children }
}

/**
 * Parse one condition and its children. The nesting depth was bounded by
 * checkLimits, so the recursion is too.
 */
const parseCondition = (raw: unknown, where: string): Parsed<FilterNode> => {
  if (!isRecord(raw)) {
    return fail(SkipReason.INVALID, `${where}: Expected an object`)
  }
  const id = readOwn(raw, 'id')
  if (typeof id !== 'string') {
    return fail(SkipReason.INVALID, `${where}.id: Expected a string`)
  }
  const fullId = toFullTransformerId(id)

  switch (fullId) {
    case FilterTypeId.Composite: {
      const parameters = parseParameters(CompositeParametersSchema, raw, where)
      if (!parameters.ok) return parameters
      const children = parseChildren(raw, where)
      if (!children.ok) return children
      return {
        ok: true,
        value: createCompositeFilter(
          parameters.value.type ?? MatchType.ALL,
          children.value,
        ),
      }
    }
    case FilterTypeId.Column: {
      const parameters = parseParameters(ColumnParametersSchema, raw, where)
      if (!parameters.ok) return parameters
      const {
        predicate,
        criterion,
        caseSensitive,
        type,
        anyMatch,
        columnName,
      } = parameters.value
      const defaults = createColumnFilter()
      const node: ColumnFilterNode = {
        ...defaults,
        columnName: columnName ?? null,
        target: type ?? defaults.target,
        predicate: predicate ?? null,
        criterion: criterion ?? null,
        caseSensitive: caseSensitive ?? defaults.caseSensitive,
        anyMatch: anyMatch ?? defaults.anyMatch,
      }
      return { ok: true, value: node }
    }
    case FilterTypeId.Degree: {
      const parameters = parseParameters(DegreeParametersSchema, raw, where)
      if (!parameters.ok) return parameters
      const defaults = createDegreeFilter()
      const node: DegreeFilterNode = {
        ...defaults,
        edgeType: parameters.value.edgeType ?? defaults.edgeType,
        predicate:
          parameters.value.predicate === undefined
            ? defaults.predicate
            : parameters.value.predicate,
        criterion: parameters.value.criterion ?? null,
      }
      return { ok: true, value: node }
    }
    case FilterTypeId.Topology: {
      const parameters = parseParameters(TopologyParametersSchema, raw, where)
      if (!parameters.ok) return parameters
      const children = parseChildren(raw, where)
      if (!children.ok) return children
      const defaults = createTopologyFilter()
      const node: TopologyFilterNode = {
        ...defaults,
        predicate:
          parameters.value.predicate === undefined
            ? defaults.predicate
            : parameters.value.predicate,
        distance: parameters.value.distance ?? null,
        threshold: parameters.value.threshold ?? null,
        matchType: parameters.value.type ?? defaults.matchType,
        children: children.value,
      }
      return { ok: true, value: node }
    }
    default:
      // A chain transformer nested in a filter is as foreign as an unknown id
      return fail(SkipReason.UNKNOWN_ID, `${where}.id: Unknown filter "${id}"`)
  }
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/**
 * Parse one entry of a filter file into a filter. As in Cytoscape Desktop,
 * an entry holding a single group becomes that group; otherwise its
 * conditions go into a new "match all" group. Unlike Cytoscape Desktop, a
 * single topology condition is kept whole rather than unwrapped.
 */
const parseEntry = (raw: unknown, index: number): Parsed<NamedFilter> => {
  const where = `[${index}]`
  if (!isRecord(raw)) {
    return fail(SkipReason.INVALID, `${where}: Expected an object`)
  }
  const name = readOwn(raw, 'name')
  if (typeof name !== 'string' || name.trim() === '') {
    return fail(
      SkipReason.INVALID,
      `${where}.name: Expected a non-empty string`,
    )
  }
  const transformers = readOwn(raw, 'transformers')
  if (!Array.isArray(transformers)) {
    return fail(SkipReason.INVALID, `${where}.transformers: Expected an array`)
  }

  // Classify the top level before parsing anything
  const filterTransformers: { raw: unknown; where: string }[] = []
  let hasChain = false
  for (let i = 0; i < transformers.length; i++) {
    const transformer: unknown = transformers[i]
    const transformerWhere = `${where}.transformers.${i}`
    const id = isRecord(transformer) ? readOwn(transformer, 'id') : undefined
    if (typeof id !== 'string') {
      return fail(
        SkipReason.INVALID,
        `${transformerWhere}.id: Expected a string`,
      )
    }
    const fullId = toFullTransformerId(id)
    if (CHAIN_IDS.has(fullId)) {
      hasChain = true
    } else if (FILTER_IDS.has(fullId)) {
      filterTransformers.push({ raw: transformer, where: transformerWhere })
    } else {
      return fail(
        SkipReason.UNKNOWN_ID,
        `${transformerWhere}.id: Unknown filter "${id}"`,
      )
    }
  }
  if (filterTransformers.length === 0) {
    return hasChain
      ? fail(SkipReason.CHAIN, `${where}: Chains are not supported`)
      : fail(SkipReason.NO_FILTER, `${where}: Holds no filter`)
  }

  const conditions: FilterNode[] = []
  for (const transformer of filterTransformers) {
    const condition = parseCondition(transformer.raw, transformer.where)
    if (!condition.ok) return condition
    conditions.push(condition.value)
  }
  const [first] = conditions
  const root: CompositeFilterNode =
    conditions.length === 1 && first.type === FilterTypeId.Composite
      ? first
      : createCompositeFilter(MatchType.ALL, conditions)
  return { ok: true, value: { name: name.trim(), root } }
}

/**
 * Check nesting depth and condition count without recursion, so a hostile
 * file cannot overflow the stack before the schemas see it
 *
 * @returns An error message, or undefined when within the limits
 */
const checkLimits = (entries: readonly unknown[]): string | undefined => {
  const stack: { node: unknown; depth: number }[] = []
  entries.forEach((entry) => {
    if (!isRecord(entry)) return
    const transformers = readOwn(entry, 'transformers')
    if (Array.isArray(transformers)) {
      transformers.forEach((node: unknown) => stack.push({ node, depth: 1 }))
    }
  })
  let count = 0
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    count++
    if (count > MAX_FILTER_CONDITIONS) {
      return `The file holds more than ${MAX_FILTER_CONDITIONS} conditions`
    }
    if (depth > MAX_FILTER_DEPTH) {
      return `Conditions are nested more than ${MAX_FILTER_DEPTH} levels deep`
    }
    if (!isRecord(node)) continue
    const children = readOwn(node, 'transformers')
    if (Array.isArray(children)) {
      children.forEach((child: unknown) =>
        stack.push({ node: child, depth: depth + 1 }),
      )
    }
  }
  return undefined
}

/**
 * Read the parsed JSON of a filter file. Never throws.
 *
 * Unlike Cytoscape Desktop, which rejects the whole file on an unknown
 * filter type, an entry that cannot be read is skipped and reported, and
 * the other entries are kept. Chain entries are skipped. Names repeated in
 * the file are made unique ("name 2"); clashes with existing filters are
 * the importer's to resolve.
 */
export const parseCyFilterJson = (value: unknown): CyFilterParseResult => {
  if (!Array.isArray(value)) {
    return {
      success: false,
      error: `Not a filter file: expected an array, got ${value === null ? 'null' : typeof value}`,
    }
  }
  const limitError = checkLimits(value)
  if (limitError !== undefined) {
    return { success: false, error: limitError }
  }

  const filters: NamedFilter[] = []
  const skipped: SkippedFilterEntry[] = []
  value.forEach((raw: unknown, index: number) => {
    const entry = parseEntry(raw, index)
    if (entry.ok) {
      const names = filters.map((filter) => filter.name)
      filters.push({
        ...entry.value,
        name: uniqueFilterName(names, entry.value.name),
      })
      return
    }
    const name =
      isRecord(raw) && typeof readOwn(raw, 'name') === 'string'
        ? (readOwn(raw, 'name') as string)
        : undefined
    skipped.push({ index, name, reason: entry.reason, detail: entry.detail })
    logModel.warn(
      `[parseCyFilterJson]: Skipping filter entry ${index}${name === undefined ? '' : ` "${name}"`} (${entry.reason}): ${entry.detail}`,
    )
  })
  return { success: true, filters, skipped }
}

/**
 * Read the text of a filter file. Never throws.
 */
export const parseCyFilterText = (text: string): CyFilterParseResult => {
  if (text.length > MAX_FILE_LENGTH) {
    return {
      success: false,
      error: `The file is larger than ${MAX_FILE_LENGTH} characters`,
    }
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (e) {
    return {
      success: false,
      error: `Not a JSON file: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
  return parseCyFilterJson(value)
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// The object literals below fix the key order: Cytoscape Desktop's reader
// requires "name" before "transformers", and "id", "parameters",
// "transformers" in that order. JSON.stringify keeps insertion order.
const serializeCondition = (node: FilterNode): Record<string, unknown> => {
  switch (node.type) {
    case FilterTypeId.Composite:
      return {
        id: node.type,
        parameters: { type: node.matchType },
        transformers: node.children.map(serializeCondition),
      }
    case FilterTypeId.Column:
      return {
        id: node.type,
        parameters: {
          predicate: node.predicate,
          criterion: node.criterion,
          caseSensitive: node.caseSensitive,
          type: node.target,
          anyMatch: node.anyMatch,
          columnName: node.columnName,
        },
      }
    case FilterTypeId.Degree:
      return {
        id: node.type,
        parameters: {
          predicate: node.predicate,
          criterion: node.criterion,
          edgeType: node.edgeType,
        },
      }
    case FilterTypeId.Topology:
      return {
        id: node.type,
        parameters: {
          predicate: node.predicate,
          distance: node.distance,
          threshold: node.threshold,
          type: node.matchType,
        },
        transformers: node.children.map(serializeCondition),
      }
  }
}

/**
 * One entry of a Cytoscape Desktop filter file, as plain JSON data
 */
export interface CyFilterEntry {
  readonly name: string
  readonly transformers: Record<string, unknown>[]
}

/**
 * A filter as one entry of a filter file: its name and its root group, as
 * Cytoscape Desktop's Filter panel exports it. CW-only state, such as the
 * display mode, is left out.
 */
export const toCyFilterEntry = (filter: NamedFilter): CyFilterEntry => ({
  name: filter.name,
  transformers: [serializeCondition(filter.root)],
})

/**
 * Write filters as a Cytoscape Desktop filter file, one entry per filter
 */
export const serializeCyFilters = (filters: readonly NamedFilter[]): string =>
  JSON.stringify(filters.map(toCyFilterEntry), null, 2)
