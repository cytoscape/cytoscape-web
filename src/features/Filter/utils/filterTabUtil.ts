import type { ApplyWorkspaceFilterResult } from '@/data/filter/applyWorkspaceFilter'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import {
  ColumnFilterTarget,
  FilterNodePath,
  FilterPredicate,
  NumberRangeCriterion,
  WorkspaceFilter,
} from '@/models/FilterModel/FilterTree'
import type { FilterValidationWarning } from '@/models/FilterModel/impl/validateFilter'
import type { Network } from '@/models/NetworkModel/Network'
import type { NumberRange } from '@/models/PropertyModel/NumberRange'
import type { Column } from '@/models/TableModel/Column'
import type { Table } from '@/models/TableModel/Table'

/**
 * Networks with fewer elements than this get "Apply when filter changes" on
 * by default, as in Cytoscape Desktop (ModelMonitor.INTERACTIVITY_THRESHOLD)
 */
export const AUTO_APPLY_ELEMENT_LIMIT = 100_000

export const defaultAutoApply = (network: Network | undefined): boolean =>
  network === undefined ||
  network.nodes.length + network.edges.length < AUTO_APPLY_ELEMENT_LIMIT

/** The tables a column condition can pick from (never both) */
export type ColumnTableTarget =
  | typeof ColumnFilterTarget.NODES
  | typeof ColumnFilterTarget.EDGES

/**
 * A column offered by the column picker of a column condition
 */
export interface ColumnOption {
  // Unique among the options: the table and the column name
  readonly key: string
  readonly target: ColumnTableTarget
  readonly column: Column
  // "Node: name" or "Edge: name"
  readonly label: string
}

export const columnOptionKey = (target: string, columnName: string): string =>
  `${target}:${columnName}`

const optionsOf = (table: Table, target: ColumnTableTarget): ColumnOption[] =>
  [...table.columns]
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    .map((column) => ({
      key: columnOptionKey(target, column.name),
      target,
      column,
      label: `${target === ColumnFilterTarget.NODES ? 'Node' : 'Edge'}: ${column.name}`,
    }))

/**
 * The columns a column condition can use: node columns, then edge columns,
 * each sorted by name ignoring case, as Cytoscape Desktop lists them
 */
export const listColumnOptions = (
  nodeTable: Table,
  edgeTable: Table,
): ColumnOption[] => [
  ...optionsOf(nodeTable, ColumnFilterTarget.NODES),
  ...optionsOf(edgeTable, ColumnFilterTarget.EDGES),
]

/**
 * Filters in the order the filter picker lists them: by name, ignoring case
 */
export const sortFiltersByName = (
  filters: readonly WorkspaceFilter[],
): WorkspaceFilter[] =>
  [...filters].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )

/** Labels of the text predicates, in Cytoscape Desktop's order */
export const STRING_PREDICATE_LABELS: ReadonlyArray<
  readonly [FilterPredicate, string]
> = [
  [FilterPredicate.CONTAINS, 'contains'],
  [FilterPredicate.DOES_NOT_CONTAIN, "doesn't contain"],
  [FilterPredicate.IS, 'is'],
  [FilterPredicate.IS_NOT, 'is not'],
  [FilterPredicate.REGEX, 'matches regex'],
]

/**
 * The numeric comparisons the editor offers, as Cytoscape Desktop's Filter
 * panel does: the value "is" or "is not" within a range. The range covers
 * "at least" and "at most" too (one bound at the column's minimum or
 * maximum).
 */
export const RANGE_PREDICATE_LABELS: ReadonlyArray<
  readonly [FilterPredicate, string]
> = [
  [FilterPredicate.BETWEEN, 'is'],
  [FilterPredicate.IS_NOT_BETWEEN, 'is not'],
]

/**
 * Labels of the single-value numeric predicates. Cytoscape Desktop's panel
 * cannot create them (only its commands and filter files can), and cannot
 * show them either, so the editor offers one only to show an imported
 * condition that already uses it.
 */
export const SINGLE_VALUE_PREDICATE_LABELS: Readonly<
  Partial<Record<FilterPredicate, string>>
> = {
  [FilterPredicate.IS]: 'is equal to',
  [FilterPredicate.IS_NOT]: 'is not equal to',
  [FilterPredicate.GREATER_THAN]: 'is greater than',
  [FilterPredicate.GREATER_THAN_OR_EQUAL]: 'is at least',
  [FilterPredicate.LESS_THAN]: 'is less than',
  [FilterPredicate.LESS_THAN_OR_EQUAL]: 'is at most',
}

/**
 * The options of a numeric condition's comparison: "is" / "is not", plus the
 * condition's own predicate when it is another one
 */
export const numericPredicateOptions = (
  current: FilterPredicate | null,
): ReadonlyArray<readonly [FilterPredicate, string]> =>
  current === null || isRangePredicate(current)
    ? RANGE_PREDICATE_LABELS
    : [
        ...RANGE_PREDICATE_LABELS,
        [current, SINGLE_VALUE_PREDICATE_LABELS[current] ?? current],
      ]

/**
 * The range that keeps the meaning of a single-value condition as closely as
 * an inclusive range can, when the user switches it to "is" / "is not":
 * "at least 5" becomes [5, max], "at most 5" [min, 5], "equal to 5" [5, 5]
 */
export const toRangeCriterion = (
  predicate: FilterPredicate | null,
  value: number,
  bounds: NumberRange,
): NumberRangeCriterion => {
  switch (predicate) {
    case FilterPredicate.GREATER_THAN:
    case FilterPredicate.GREATER_THAN_OR_EQUAL:
      return [value, Math.max(bounds.max, value)]
    case FilterPredicate.LESS_THAN:
    case FilterPredicate.LESS_THAN_OR_EQUAL:
      return [Math.min(bounds.min, value), value]
    default:
      return [value, value]
  }
}

export const isRangePredicate = (predicate: FilterPredicate | null): boolean =>
  predicate === FilterPredicate.BETWEEN ||
  predicate === FilterPredicate.IS_NOT_BETWEEN

/**
 * Key of a condition path, for lookups
 */
export const pathKey = (path: FilterNodePath): string => path.join('.')

/**
 * Validation warnings grouped by the path of their condition
 */
export const warningsByPath = (
  warnings: readonly FilterValidationWarning[],
): Map<string, string[]> => {
  const byPath = new Map<string, string[]>()
  warnings.forEach(({ path, message }) => {
    const key = pathKey(path)
    byPath.set(key, [...(byPath.get(key) ?? []), message])
  })
  return byPath
}

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

/** The status line while the filter has no condition: applying does nothing */
export const EMPTY_FILTER_STATUS = 'Add a condition to apply the filter.'

/**
 * The status line under the Apply button, after a filter was applied
 */
export const formatApplyStatus = (
  result: ApplyWorkspaceFilterResult,
): string => {
  if (!result.success) {
    switch (result.error) {
      case 'network-not-found':
        return 'The network is not loaded yet.'
      case 'style-not-found':
        return 'The network has no style to show the result with.'
      default:
        return 'The filter no longer exists.'
    }
  }
  if (!result.applied) {
    return EMPTY_FILTER_STATUS
  }
  const verb =
    result.displayMode === DisplayMode.SHOW_HIDE ? 'Showing' : 'Selected'
  return `${verb} ${plural(result.nodeCount, 'node')} and ${plural(
    result.edgeCount,
    'edge',
  )} in ${Math.round(result.elapsedMs)} ms`
}

/**
 * Round a slider value to 6 significant digits, so a double slider does not
 * produce values such as 0.30000000000000004
 */
export const roundForDisplay = (value: number): number =>
  Number.isFinite(value) ? Number(value.toPrecision(6)) : value
