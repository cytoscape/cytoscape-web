import { z } from 'zod'

import type { Table } from '../../../TableModel/Table'
import { ValueTypeName } from '../../../TableModel/ValueTypeName'
import { DisplayMode } from '../../DisplayMode'
import {
  ColumnFilterNode,
  ColumnFilterTarget,
  CompositeFilterNode,
  DegreeEdgeType,
  FilterElementKind,
  FilterNode,
  FilterPredicate,
  FilterTypeId,
  MatchType,
  NamedFilter,
} from '../../FilterTree'
import { parseCyFilterJson } from '../cyFilterJson'
import { appliesTo } from '../evaluateFilter'
import { columnKindOf, getNodeAt } from '../filterTreeImpl'
import { validateFilter } from '../validateFilter'
import { negateForHide } from './negateForHide'

/**
 * Reading an LLM's answer to a filter request
 * (docs/specifications/LLM_FILTER_GENERATION_SPEC.md, "The answer" and
 * "Checking the answer"). The answer is untrusted input: it reaches the
 * workspace only through the filter file parser, a stricter policy for
 * generated filters, and a check against the target network.
 */

/** Longer answers are refused unread */
export const MAX_ANSWER_LENGTH = 64_000

/** Generated filters hold at most this many conditions… */
export const MAX_GENERATED_CONDITIONS = 30

/** …nested at most this deep (the root group's conditions are at depth 1) */
export const MAX_GENERATED_DEPTH = 6

export const MAX_NAME_LENGTH = 100
export const MAX_MODEL_TEXT_LENGTH = 300

/** The name of a generated filter when the model proposes none */
export const DEFAULT_GENERATED_FILTER_NAME = 'Generated filter'

/**
 * What the request asked for: select the matches, show only them, or hide
 * them
 */
export const GenerationMode = {
  SELECT: 'select',
  SHOW: 'show',
  HIDE: 'hide',
} as const

export type GenerationMode =
  (typeof GenerationMode)[keyof typeof GenerationMode]

export const displayModeOf = (mode: GenerationMode): DisplayMode =>
  mode === GenerationMode.SELECT ? DisplayMode.SELECT : DisplayMode.SHOW_HIDE

export type FilterAnswer =
  | {
      readonly kind: 'filter'
      // In hide mode, already negated: the filter that shows the rest
      readonly filter: NamedFilter
      readonly mode: GenerationMode
      readonly displayMode: DisplayMode
      readonly explanation: string
    }
  | { readonly kind: 'unsupported'; readonly reason: string }
  // What is wrong, in words the model can act on
  | { readonly kind: 'problems'; readonly problems: string[] }

// ---------------------------------------------------------------------------
// The JSON schema of the answer, for structured output
// ---------------------------------------------------------------------------

const TEXT_PREDICATES = [
  FilterPredicate.IS,
  FilterPredicate.IS_NOT,
  FilterPredicate.CONTAINS,
  FilterPredicate.DOES_NOT_CONTAIN,
] as const

const RANGE_PREDICATES = [
  FilterPredicate.BETWEEN,
  FilterPredicate.IS_NOT_BETWEEN,
] as const

const COUNT_PREDICATES = [
  FilterPredicate.GREATER_THAN_OR_EQUAL,
  FilterPredicate.LESS_THAN,
] as const

const MATCH_TYPES = [MatchType.ALL, MatchType.ANY] as const

const enumOf = (values: readonly string[]) => ({
  type: 'string',
  enum: [...values],
})

const object = <T extends Record<string, unknown>>(properties: T) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
})

const CONDITIONS = { type: 'array', items: { $ref: '#/$defs/condition' } }
const RANGE = { type: 'array', items: { type: 'number' } }

/**
 * The JSON schema of an answer, in the subset OpenAI's strict structured
 * output accepts: every property required, no additional properties, a
 * single object at the root. Built from the model's constants so it cannot
 * drift from the parser. It is an aid only: every answer is checked by
 * readFilterAnswer whatever the endpoint did with it.
 */
export const FILTER_ANSWER_JSON_SCHEMA = {
  ...object({
    outcome: enumOf(['filter', 'unsupported']),
    mode: {
      type: ['string', 'null'],
      enum: [...Object.values(GenerationMode), null],
    },
    name: { type: ['string', 'null'] },
    explanation: { type: ['string', 'null'] },
    reason: { type: ['string', 'null'] },
    transformers: { anyOf: [CONDITIONS, { type: 'null' }] },
  }),
  $defs: {
    condition: {
      anyOf: [
        { $ref: '#/$defs/group' },
        { $ref: '#/$defs/column' },
        { $ref: '#/$defs/degree' },
        { $ref: '#/$defs/topology' },
      ],
    },
    group: object({
      id: enumOf([FilterTypeId.Composite]),
      parameters: object({ type: enumOf(MATCH_TYPES) }),
      transformers: CONDITIONS,
    }),
    column: object({
      id: enumOf([FilterTypeId.Column]),
      parameters: object({
        columnName: { type: 'string' },
        type: enumOf([ColumnFilterTarget.NODES, ColumnFilterTarget.EDGES]),
        predicate: enumOf([...TEXT_PREDICATES, ...RANGE_PREDICATES]),
        criterion: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            RANGE,
          ],
        },
        caseSensitive: { type: 'boolean' },
        anyMatch: { type: 'boolean' },
      }),
    }),
    degree: object({
      id: enumOf([FilterTypeId.Degree]),
      parameters: object({
        predicate: enumOf(RANGE_PREDICATES),
        criterion: RANGE,
        edgeType: enumOf(Object.values(DegreeEdgeType)),
      }),
    }),
    topology: object({
      id: enumOf([FilterTypeId.Topology]),
      parameters: object({
        predicate: enumOf(COUNT_PREDICATES),
        distance: { type: 'integer' },
        threshold: { type: 'integer' },
        type: enumOf(MATCH_TYPES),
      }),
      transformers: CONDITIONS,
    }),
  },
} as const

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

const ENVELOPE_KEYS = [
  'outcome',
  'mode',
  'name',
  'explanation',
  'reason',
  'transformers',
] as const

const OptionalText = z.string().nullish()

const EnvelopeSchema = z.object({
  outcome: z.enum(['filter', 'unsupported']),
  mode: z
    .enum([GenerationMode.SELECT, GenerationMode.SHOW, GenerationMode.HIDE])
    .nullish(),
  name: OptionalText,
  explanation: OptionalText,
  reason: OptionalText,
  transformers: z.array(z.unknown()).nullish(),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Trim a text from the model and cut it to `max` characters, ending a cut
 * one with "…"
 */
export const cutText = (
  text: string | null | undefined,
  max: number,
): string => {
  const chars = Array.from((text ?? '').trim())
  return chars.length > max
    ? `${chars.slice(0, max - 1).join('')}…`
    : chars.join('')
}

/**
 * The JSON value in an answer: the whole text, or else the span from its
 * first "{" to its last "}" (which also strips a Markdown code fence and
 * prose around the object)
 */
const extractJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return undefined
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return undefined
    }
  }
}

// ---------------------------------------------------------------------------
// Generation policy
// ---------------------------------------------------------------------------

/**
 * A short description of a condition for a problem report, so the model can
 * find it in its own answer
 */
const describe = (node: FilterNode): string => {
  switch (node.type) {
    case FilterTypeId.Column:
      return `The condition on ${node.target === ColumnFilterTarget.EDGES ? 'edge' : 'node'} column "${node.columnName ?? ''}"`
    case FilterTypeId.Degree:
      return 'The degree condition'
    case FilterTypeId.Topology:
      return 'The topology condition'
    case FilterTypeId.Composite:
      return 'A group'
    default:
      return 'A condition'
  }
}

const isRange = (criterion: unknown): criterion is readonly [number, number] =>
  Array.isArray(criterion) &&
  criterion.length === 2 &&
  typeof criterion[0] === 'number' &&
  typeof criterion[1] === 'number' &&
  Number.isFinite(criterion[0]) &&
  Number.isFinite(criterion[1]) &&
  criterion[0] <= criterion[1]

const columnTypeOf = (
  node: ColumnFilterNode,
  nodeTable: Table,
  edgeTable: Table,
): ValueTypeName | undefined => {
  const table = node.target === ColumnFilterTarget.EDGES ? edgeTable : nodeTable
  return table.columns.find((column) => column.name === node.columnName)?.type
}

const checkColumn = (
  node: ColumnFilterNode,
  mode: GenerationMode,
  nodeTable: Table,
  edgeTable: Table,
): string[] => {
  const what = describe(node)
  if (
    node.columnName === null ||
    node.predicate === null ||
    node.criterion === null
  ) {
    return [`${what} needs a columnName, a predicate and a criterion.`]
  }
  const problems: string[] = []
  if (node.predicate === FilterPredicate.REGEX) {
    problems.push(
      `${what} uses REGEX, which is not allowed. Use CONTAINS or IS.`,
    )
  }
  if (node.target === ColumnFilterTarget.NODES_AND_EDGES) {
    problems.push(`${what} must have "type" "nodes" or "edges".`)
  }
  if (node.caseSensitive) {
    problems.push(`${what} must have "caseSensitive" false.`)
  }
  // A column missing from the network is reported by validateFilter
  const type = columnTypeOf(node, nodeTable, edgeTable)
  const kind = type === undefined ? undefined : columnKindOf(type)
  if (
    kind === 'number' &&
    (!RANGE_PREDICATES.some((p) => p === node.predicate) ||
      !isRange(node.criterion))
  ) {
    problems.push(
      `${what} is on a number column: use BETWEEN or IS_NOT_BETWEEN with a criterion [low, high], low <= high.`,
    )
  }
  if (kind === 'boolean' && node.predicate !== FilterPredicate.IS) {
    problems.push(`${what} is on a boolean column: use IS with true or false.`)
  }
  if (mode === GenerationMode.HIDE && type === ValueTypeName.ListBoolean) {
    problems.push(
      `${what} is on a list of booleans, which a "hide" filter cannot use.`,
    )
  }
  return problems
}

const checkNode = (
  node: FilterNode,
  depth: number,
  mode: GenerationMode,
  nodeTable: Table,
  edgeTable: Table,
): string[] => {
  const what = describe(node)
  const depthProblem =
    depth > MAX_GENERATED_DEPTH
      ? [`Conditions are nested more than ${MAX_GENERATED_DEPTH} levels deep.`]
      : []
  const children = (list: readonly FilterNode[]): string[] =>
    list.flatMap((child) =>
      checkNode(child, depth + 1, mode, nodeTable, edgeTable),
    )
  switch (node.type) {
    case FilterTypeId.Composite:
      return [
        ...depthProblem,
        ...(node.children.length === 0 ? [`${what} is empty.`] : []),
        ...children(node.children),
      ]
    case FilterTypeId.Column:
      return [...depthProblem, ...checkColumn(node, mode, nodeTable, edgeTable)]
    case FilterTypeId.Degree:
      return [
        ...depthProblem,
        ...(!RANGE_PREDICATES.some((p) => p === node.predicate) ||
        !isRange(node.criterion)
          ? [
              `${what} must use BETWEEN or IS_NOT_BETWEEN with a criterion [low, high], low <= high.`,
            ]
          : []),
      ]
    case FilterTypeId.Topology:
      return [
        ...depthProblem,
        ...(!COUNT_PREDICATES.some((p) => p === node.predicate) ||
        node.distance === null ||
        node.threshold === null
          ? [
              `${what} must use GREATER_THAN_OR_EQUAL or LESS_THAN, with a distance and a threshold.`,
            ]
          : []),
        // Neighbour conditions are never negated, and may be empty
        ...children(node.children),
      ]
    default:
      return [`${what} has an unknown type.`]
  }
}

const countConditions = (node: FilterNode): number =>
  node.type === FilterTypeId.Composite || node.type === FilterTypeId.Topology
    ? node.children.reduce((sum, child) => sum + 1 + countConditions(child), 0)
    : 0

/**
 * The rules a generated filter must follow on top of the filter file
 * format: conditions the FILTER tab can edit and, in hide mode, negate
 *
 * @returns One problem per broken rule; none when the filter is fine
 */
export const checkGeneratedFilter = (
  root: CompositeFilterNode,
  mode: GenerationMode,
  nodeTable: Table,
  edgeTable: Table,
): string[] => {
  if (root.children.length === 0) {
    return ['The filter has no condition.']
  }
  const problems = checkNode(root, 0, mode, nodeTable, edgeTable)
  if (countConditions(root) > MAX_GENERATED_CONDITIONS) {
    problems.push(
      `The filter has more than ${MAX_GENERATED_CONDITIONS} conditions.`,
    )
  }
  if (
    mode === GenerationMode.HIDE &&
    appliesTo(root, FilterElementKind.NODE) &&
    appliesTo(root, FilterElementKind.EDGE)
  ) {
    problems.push(
      'A "hide" filter must have conditions about nodes only or edges only.',
    )
  }
  // Each message once: the depth problem repeats for every deep condition
  return Array.from(new Set(problems))
}

// ---------------------------------------------------------------------------
// Reading an answer
// ---------------------------------------------------------------------------

const problems = (...list: string[]): FilterAnswer => ({
  kind: 'problems',
  problems: list,
})

/**
 * Read an LLM's answer to a filter request and check it against the network
 * it is for. Never throws.
 *
 * @returns The filter (negated in hide mode), the model's reason when the
 *   request cannot be expressed, or the problems to send back to the model
 */
export const readFilterAnswer = (
  text: string,
  nodeTable: Table,
  edgeTable: Table,
): FilterAnswer => {
  if (text.length > MAX_ANSWER_LENGTH) {
    return problems(
      `The answer is longer than ${MAX_ANSWER_LENGTH} characters.`,
    )
  }
  const value = extractJson(text)
  if (!isRecord(value)) {
    return problems('The answer is not one JSON object.')
  }
  // Own keys only, and only the envelope's
  const own: Record<string, unknown> = {}
  ENVELOPE_KEYS.forEach((key) => {
    if (Object.hasOwn(value, key)) own[key] = value[key]
  })
  const envelope = EnvelopeSchema.safeParse(own)
  if (!envelope.success) {
    return problems(
      ...envelope.error.issues.map(
        (issue) => `"${issue.path.join('.') || 'answer'}": ${issue.message}.`,
      ),
    )
  }
  const { outcome, mode, name, explanation, reason, transformers } =
    envelope.data

  if (outcome === 'unsupported') {
    return {
      kind: 'unsupported',
      reason: cutText(reason, MAX_MODEL_TEXT_LENGTH),
    }
  }
  if (mode === null || mode === undefined) {
    return problems('"mode" must be "select", "show" or "hide".')
  }
  if (transformers === null || transformers === undefined) {
    return problems('"transformers" must hold the conditions.')
  }

  const filterName =
    cutText(name, MAX_NAME_LENGTH) || DEFAULT_GENERATED_FILTER_NAME
  const parsed = parseCyFilterJson([{ name: filterName, transformers }])
  if (!parsed.success) {
    return problems(parsed.error)
  }
  if (parsed.skipped.length > 0 || parsed.filters.length !== 1) {
    return problems(
      ...parsed.skipped.map((entry) => entry.detail),
      ...(parsed.skipped.length === 0 ? ['The answer holds no filter.'] : []),
    )
  }
  const [filter] = parsed.filters

  const policyProblems = checkGeneratedFilter(
    filter.root,
    mode,
    nodeTable,
    edgeTable,
  )
  if (policyProblems.length > 0) {
    return problems(...policyProblems)
  }

  // Checked as the model wrote it, so the problems name its conditions
  const warnings = validateFilter(filter.root, nodeTable, edgeTable)
  if (warnings.length > 0) {
    return problems(
      ...warnings.map((warning) => {
        const node = getNodeAt(filter.root, warning.path)
        return node === undefined
          ? `${warning.message}.`
          : `${describe(node)}: ${warning.message}.`
      }),
    )
  }

  let root = filter.root
  if (mode === GenerationMode.HIDE) {
    const negated = negateForHide(root)
    if (negated === undefined) {
      return problems(
        'The conditions of this "hide" filter cannot be reversed.',
      )
    }
    root = negated
  }

  return {
    kind: 'filter',
    filter: { name: filter.name, root },
    mode,
    displayMode: displayModeOf(mode),
    explanation: cutText(explanation, MAX_MODEL_TEXT_LENGTH),
  }
}
