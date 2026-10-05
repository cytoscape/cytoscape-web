import type { IdType } from '../IdType'
import type { DisplayMode } from './DisplayMode'

/**
 * Filters of the FILTER tab, in the shape Cytoscape Desktop uses for its
 * Filter panel and its filter files (`docs/specifications/FILTER_SPECIFICATION.md`).
 *
 * A filter is a tree of conditions. Each condition is identified by the
 * Cytoscape Desktop transformer id it is read from and written to, so a file
 * exported from one application imports into the other.
 */

/**
 * Ids of the condition types the FILTER tab supports. They are Cytoscape
 * Desktop's transformer ids and appear verbatim in filter files.
 */
export const FilterTypeId = {
  Composite: 'org.cytoscape.CompositeFilter',
  Column: 'org.cytoscape.ColumnFilter',
  Degree: 'org.cytoscape.DegreeFilter',
  Topology: 'org.cytoscape.TopologyFilter',
} as const

export type FilterTypeId = (typeof FilterTypeId)[keyof typeof FilterTypeId]

/**
 * Ids of Cytoscape Desktop's Chain transformers. A filter file can hold
 * chains next to filters; they are recognized only to be skipped on import.
 */
export const ChainTransformerId = {
  Adjacency: 'org.cytoscape.AdjacencyTransformer',
  Interaction: 'org.cytoscape.InteractionTransformer',
} as const

export type ChainTransformerId =
  (typeof ChainTransformerId)[keyof typeof ChainTransformerId]

/**
 * Comparison of a condition. The names are Cytoscape Desktop's `Predicate`
 * enum values, written verbatim in filter files.
 */
export const FilterPredicate = {
  IS: 'IS',
  IS_NOT: 'IS_NOT',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  BETWEEN: 'BETWEEN',
  IS_NOT_BETWEEN: 'IS_NOT_BETWEEN',
  CONTAINS: 'CONTAINS',
  DOES_NOT_CONTAIN: 'DOES_NOT_CONTAIN',
  REGEX: 'REGEX',
} as const

export type FilterPredicate =
  (typeof FilterPredicate)[keyof typeof FilterPredicate]

/**
 * How a group combines its conditions: ALL (AND) or ANY (OR)
 */
export const MatchType = {
  ALL: 'ALL',
  ANY: 'ANY',
} as const

export type MatchType = (typeof MatchType)[keyof typeof MatchType]

/**
 * The elements a column condition reads. The FILTER tab only creates
 * `nodes` or `edges`; `nodes+edges` comes from imported files and needs a
 * column of the same name in both tables.
 */
export const ColumnFilterTarget = {
  NODES: 'nodes',
  EDGES: 'edges',
  NODES_AND_EDGES: 'nodes+edges',
} as const

export type ColumnFilterTarget =
  (typeof ColumnFilterTarget)[keyof typeof ColumnFilterTarget]

/**
 * The edges a degree condition counts: In + Out, In or Out
 */
export const DegreeEdgeType = {
  ANY: 'ANY',
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
} as const

export type DegreeEdgeType =
  (typeof DegreeEdgeType)[keyof typeof DegreeEdgeType]

/**
 * An inclusive numeric range: [lower bound, upper bound]
 */
export type NumberRangeCriterion = readonly [number, number]

/**
 * The value a column condition compares against. A number stands for the
 * range [n, n]; which kind applies depends on the column's type.
 */
export type ColumnFilterCriterion =
  | string
  | number
  | boolean
  | NumberRangeCriterion
  | null

/**
 * A group of conditions. An empty group accepts every element.
 */
export interface CompositeFilterNode {
  readonly type: typeof FilterTypeId.Composite
  readonly matchType: MatchType
  readonly children: readonly FilterNode[]
}

/**
 * Compares the value of one table column. Unset fields (null) make the
 * condition reject every element.
 */
export interface ColumnFilterNode {
  readonly type: typeof FilterTypeId.Column
  readonly columnName: string | null
  readonly target: ColumnFilterTarget
  readonly predicate: FilterPredicate | null
  readonly criterion: ColumnFilterCriterion
  readonly caseSensitive: boolean
  // List columns: whether any element (true) or every element (false) must
  // match
  readonly anyMatch: boolean
}

/**
 * Compares the number of edges of a node. A null criterion accepts every
 * node.
 */
export interface DegreeFilterNode {
  readonly type: typeof FilterTypeId.Degree
  readonly edgeType: DegreeEdgeType
  readonly predicate: FilterPredicate | null
  readonly criterion: NumberRangeCriterion | null
}

/**
 * Compares the number of nodes within `distance` hops of a node that match
 * its child conditions (the neighbour conditions) against `threshold`.
 */
export interface TopologyFilterNode {
  readonly type: typeof FilterTypeId.Topology
  readonly predicate: FilterPredicate | null
  readonly distance: number | null
  readonly threshold: number | null
  // How the neighbour conditions combine
  readonly matchType: MatchType
  readonly children: readonly FilterNode[]
}

export type FilterNode =
  | CompositeFilterNode
  | ColumnFilterNode
  | DegreeFilterNode
  | TopologyFilterNode

/**
 * A condition that holds child conditions
 */
export type ParentFilterNode = CompositeFilterNode | TopologyFilterNode

/**
 * Location of a condition in a filter: the child indexes from the root. The
 * root itself is the empty path.
 */
export type FilterNodePath = readonly number[]

/**
 * A filter as it appears in a filter file: a name and its root group
 */
export interface NamedFilter {
  readonly name: string
  readonly root: CompositeFilterNode
}

/**
 * A filter of the FILTER tab. It belongs to the workspace, not to a network,
 * and applies to whichever network the tab targets. The display mode is
 * CW state only: filter files never carry it.
 */
export interface WorkspaceFilter extends NamedFilter {
  readonly displayMode: DisplayMode
}

/**
 * The element kinds a filter is evaluated against
 */
export const FilterElementKind = {
  NODE: 'node',
  EDGE: 'edge',
} as const

export type FilterElementKind =
  (typeof FilterElementKind)[keyof typeof FilterElementKind]

/**
 * Ids of the nodes and edges a filter run picked
 */
export interface FilterResult {
  readonly nodeIds: IdType[]
  readonly edgeIds: IdType[]
}
