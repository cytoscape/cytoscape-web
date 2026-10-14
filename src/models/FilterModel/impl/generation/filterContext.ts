import type { Network } from '../../../NetworkModel/Network'
import type { Column } from '../../../TableModel/Column'
import type { Table } from '../../../TableModel/Table'
import type { ValueTypeName } from '../../../TableModel/ValueTypeName'
import { DegreeEdgeType } from '../../FilterTree'
import {
  columnKindOf,
  computeColumnRange,
  computeDegreeRange,
} from '../filterTreeImpl'

/**
 * What an LLM is told about a network so it can write a filter for it
 * (docs/specifications/LLM_FILTER_GENERATION_SPEC.md, "The network
 * context"). Everything here leaves the browser: the disclosure in the
 * FILTER tab must keep naming all of it.
 */

/** Columns listed per table; the rest are left out */
export const MAX_CONTEXT_COLUMNS = 150

/** Longer column names are left out: a condition could not name them */
export const MAX_COLUMN_NAME_LENGTH = 80

/** Sample values listed per text column, most frequent first */
export const MAX_SAMPLES = 8

/** Length a sample value is cut to; a cut value ends with "…" */
export const MAX_SAMPLE_LENGTH = 40

/** Length of the serialized context; past it, samples are dropped */
export const MAX_CONTEXT_LENGTH = 30_000

/** Marks a sample value that was cut */
export const CUT_MARK = '…'

export interface FilterContextColumn {
  readonly name: string
  readonly type: ValueTypeName
  // Numbers: the smallest and largest value
  readonly range?: readonly [number, number]
  // Text: the number of distinct values and the most frequent ones
  readonly distinct?: number
  readonly samples?: readonly string[]
}

export interface FilterNetworkContext {
  readonly nodeCount: number
  readonly edgeCount: number
  // Node degree ranges, per edge type
  readonly degree: Readonly<Record<DegreeEdgeType, readonly [number, number]>>
  readonly nodeColumns: readonly FilterContextColumn[]
  readonly edgeColumns: readonly FilterContextColumn[]
  // Set when columns were left out to keep the context small
  readonly nodeColumnsTruncated?: true
  readonly edgeColumnsTruncated?: true
}

// Control characters (and DEL) would only confuse the model
const stripControl = (text: string): string =>
  Array.from(text)
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')

const toSample = (value: string): string => {
  const clean = stripControl(value)
  const chars = Array.from(clean)
  return chars.length > MAX_SAMPLE_LENGTH
    ? `${chars.slice(0, MAX_SAMPLE_LENGTH).join('')}${CUT_MARK}`
    : clean
}

/**
 * The distinct text values of a column (list elements one by one) and the
 * most frequent ones. Ties are broken by value so the result is stable.
 */
const textSummary = (
  table: Table,
  columnName: string,
): { distinct: number; samples: string[] } => {
  const counts = new Map<string, number>()
  const count = (value: unknown): void => {
    if (typeof value !== 'string' || value === '') return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  table.rows.forEach((row) => {
    if (!Object.hasOwn(row, columnName)) return
    const value: unknown = row[columnName]
    if (Array.isArray(value)) {
      value.forEach(count)
    } else {
      count(value)
    }
  })
  const samples = Array.from(counts.entries())
    .sort(([a, countA], [b, countB]) =>
      countA !== countB ? countB - countA : a < b ? -1 : a > b ? 1 : 0,
    )
    .slice(0, MAX_SAMPLES)
    .map(([value]) => toSample(value))
  return { distinct: counts.size, samples }
}

const describeColumn = (table: Table, column: Column): FilterContextColumn => {
  const base = { name: column.name, type: column.type }
  switch (columnKindOf(column.type)) {
    case 'number': {
      const range = computeColumnRange(table, column.name)
      return range === undefined
        ? base
        : { ...base, range: [range.min, range.max] }
    }
    case 'string': {
      const { distinct, samples } = textSummary(table, column.name)
      return samples.length === 0
        ? { ...base, distinct }
        : { ...base, distinct, samples }
    }
    default:
      return base
  }
}

const describeColumns = (
  table: Table,
): { columns: FilterContextColumn[]; truncated: boolean } => {
  const usable = table.columns.filter(
    (column) =>
      column.name !== '' && column.name.length <= MAX_COLUMN_NAME_LENGTH,
  )
  return {
    columns: usable
      .slice(0, MAX_CONTEXT_COLUMNS)
      .map((column) => describeColumn(table, column)),
    truncated: usable.length > MAX_CONTEXT_COLUMNS,
  }
}

const toPair = (range: { min: number; max: number }): [number, number] => [
  range.min,
  range.max,
]

/**
 * Keep the serialized context within MAX_CONTEXT_LENGTH: drop the samples
 * of the columns with the most distinct values first, then, if that is not
 * enough, columns from the end of the longer table.
 */
const fitToLength = (context: FilterNetworkContext): FilterNetworkContext => {
  let fitted = context
  const tooLong = (): boolean =>
    JSON.stringify(fitted).length > MAX_CONTEXT_LENGTH

  const sampled = [
    ...fitted.nodeColumns.map((column) => ({ table: 'node', column })),
    ...fitted.edgeColumns.map((column) => ({ table: 'edge', column })),
  ]
    .filter(({ column }) => column.samples !== undefined)
    .sort((a, b) => (b.column.distinct ?? 0) - (a.column.distinct ?? 0))
  for (const { table, column } of sampled) {
    if (!tooLong()) return fitted
    const dropSamples = (columns: readonly FilterContextColumn[]) =>
      columns.map((candidate) =>
        candidate === column
          ? {
              name: candidate.name,
              type: candidate.type,
              distinct: candidate.distinct,
            }
          : candidate,
      )
    fitted =
      table === 'node'
        ? { ...fitted, nodeColumns: dropSamples(fitted.nodeColumns) }
        : { ...fitted, edgeColumns: dropSamples(fitted.edgeColumns) }
  }

  while (
    tooLong() &&
    fitted.nodeColumns.length + fitted.edgeColumns.length > 0
  ) {
    fitted =
      fitted.nodeColumns.length >= fitted.edgeColumns.length
        ? {
            ...fitted,
            nodeColumns: fitted.nodeColumns.slice(0, -1),
            nodeColumnsTruncated: true,
          }
        : {
            ...fitted,
            edgeColumns: fitted.edgeColumns.slice(0, -1),
            edgeColumnsTruncated: true,
          }
  }
  return fitted
}

/**
 * Describe a network for an LLM writing a filter: its size, degree ranges,
 * and its node and edge columns with their types, value ranges and most
 * frequent text values. Never whole tables.
 */
export const buildFilterContext = (
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
): FilterNetworkContext => {
  const nodes = describeColumns(nodeTable)
  const edges = describeColumns(edgeTable)
  return fitToLength({
    nodeCount: network.nodes.length,
    edgeCount: network.edges.length,
    degree: {
      [DegreeEdgeType.ANY]: toPair(
        computeDegreeRange(network, DegreeEdgeType.ANY),
      ),
      [DegreeEdgeType.INCOMING]: toPair(
        computeDegreeRange(network, DegreeEdgeType.INCOMING),
      ),
      [DegreeEdgeType.OUTGOING]: toPair(
        computeDegreeRange(network, DegreeEdgeType.OUTGOING),
      ),
    },
    nodeColumns: nodes.columns,
    edgeColumns: edges.columns,
    ...(nodes.truncated ? { nodeColumnsTruncated: true } : {}),
    ...(edges.truncated ? { edgeColumnsTruncated: true } : {}),
  })
}
