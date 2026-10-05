import type { ApplyWorkspaceFilterResult } from '@/data/filter/applyWorkspaceFilter'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import {
  ColumnFilterTarget,
  FilterNodePath,
  FilterPredicate,
  WorkspaceFilter,
} from '@/models/FilterModel/FilterTree'
import type { FilterValidationWarning } from '@/models/FilterModel/impl/validateFilter'
import type { Network } from '@/models/NetworkModel/Network'
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
 * Labels of the numeric predicates. Cytoscape Desktop's UI offers only the
 * two range predicates; the others can come from imported files.
 */
export const NUMERIC_PREDICATE_LABELS: ReadonlyArray<
  readonly [FilterPredicate, string]
> = [
  [FilterPredicate.BETWEEN, 'is between'],
  [FilterPredicate.IS_NOT_BETWEEN, 'is not between'],
  [FilterPredicate.IS, 'is'],
  [FilterPredicate.IS_NOT, 'is not'],
  [FilterPredicate.GREATER_THAN, 'is greater than'],
  [FilterPredicate.GREATER_THAN_OR_EQUAL, 'is at least'],
  [FilterPredicate.LESS_THAN, 'is less than'],
  [FilterPredicate.LESS_THAN_OR_EQUAL, 'is at most'],
]

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
    return 'Add a condition to apply the filter.'
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
