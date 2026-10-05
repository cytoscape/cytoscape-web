import type { IdType } from '../../IdType'
import type { Network } from '../../NetworkModel/Network'
import type { Table } from '../../TableModel/Table'
import type { ValueTypeName } from '../../TableModel/ValueTypeName'
import { DisplayMode } from '../DisplayMode'
import {
  ColumnFilterNode,
  ColumnFilterTarget,
  CompositeFilterNode,
  DegreeFilterNode,
  FilterElementKind,
  FilterNode,
  FilterPredicate,
  FilterResult,
  FilterTypeId,
  MatchType,
  TopologyFilterNode,
} from '../FilterTree'
import { buildAdjacency, degreeOf, NodeEdges } from './adjacency'
import { columnKindOf } from './filterTreeImpl'
import {
  compileRegex,
  numericAccepts,
  stringAccepts,
  toNumericBounds,
} from './predicates'

/**
 * Evaluation of the FILTER tab's filters, ported from Cytoscape Desktop's
 * filter2-impl so a filter picks the same elements in both applications.
 * See `docs/specifications/FILTER_SPECIFICATION.md`.
 */

/**
 * What one filter run reads, plus caches that live for that run only. Make a
 * new context for every run: the caches key on the filter's condition
 * objects and assume the network and tables do not change during the run.
 */
export interface FilterContext {
  readonly network: Network
  readonly nodeTable: Table
  readonly edgeTable: Table
  // Column types by table, from the table's column list
  readonly nodeColumnTypes: ReadonlyMap<string, ValueTypeName>
  readonly edgeColumnTypes: ReadonlyMap<string, ValueTypeName>
  // Built on first use by a degree or topology condition
  adjacency?: Map<IdType, NodeEdges>
  // Compiled REGEX patterns, by condition
  readonly regexes: WeakMap<ColumnFilterNode, RegExp | Error>
  // Whether a node passes a topology condition's neighbour conditions
  readonly neighbourResults: WeakMap<TopologyFilterNode, Map<IdType, boolean>>
}

const columnTypesOf = (table: Table): Map<string, ValueTypeName> =>
  new Map(table.columns.map((column) => [column.name, column.type]))

export const createFilterContext = (
  network: Network,
  nodeTable: Table,
  edgeTable: Table,
): FilterContext => ({
  network,
  nodeTable,
  edgeTable,
  nodeColumnTypes: columnTypesOf(nodeTable),
  edgeColumnTypes: columnTypesOf(edgeTable),
  regexes: new WeakMap(),
  neighbourResults: new WeakMap(),
})

const adjacencyOf = (ctx: FilterContext): Map<IdType, NodeEdges> => {
  if (ctx.adjacency === undefined) {
    ctx.adjacency = buildAdjacency(ctx.network)
  }
  return ctx.adjacency
}

// ---------------------------------------------------------------------------
// Which elements a condition is about
// ---------------------------------------------------------------------------

/**
 * Whether a condition is about elements of this kind (Cytoscape Desktop's
 * `ApplyCheck`). In show mode an element the filter is not about stays
 * visible: a node filter hides no edge.
 */
export const appliesTo = (
  node: FilterNode,
  kind: FilterElementKind,
): boolean => {
  switch (node.type) {
    case FilterTypeId.Column:
      if (node.target === ColumnFilterTarget.NODES) {
        return kind === FilterElementKind.NODE
      }
      if (node.target === ColumnFilterTarget.EDGES) {
        return kind === FilterElementKind.EDGE
      }
      return true
    case FilterTypeId.Degree:
    case FilterTypeId.Topology:
      return kind === FilterElementKind.NODE
    case FilterTypeId.Composite:
      return node.children.some((child) => appliesTo(child, kind))
    default:
      return false
  }
}

/**
 * Whether a condition cannot accept any element because it is not fully set
 * up. Only column conditions and groups can tell; as in Cytoscape Desktop,
 * degree and topology conditions always report false.
 */
export const isAlwaysFalse = (node: FilterNode): boolean => {
  switch (node.type) {
    case FilterTypeId.Column:
      return (
        node.columnName === null ||
        node.criterion === null ||
        node.predicate === null
      )
    case FilterTypeId.Composite:
      if (node.children.length === 0) return false
      return node.matchType === MatchType.ALL
        ? node.children.some(isAlwaysFalse)
        : node.children.every(isAlwaysFalse)
    default:
      return false
  }
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

const cellValue = (table: Table, id: IdType, columnName: string): unknown => {
  const row = table.rows.get(id)
  // Own keys only: a column named like an Object.prototype member reads
  // nothing rather than an inherited function
  if (row === undefined || !Object.hasOwn(row, columnName)) return null
  return row[columnName] ?? null
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null

const listMatch = (
  anyMatch: boolean,
  list: unknown,
  test: (item: unknown) => boolean,
): boolean => {
  if (!Array.isArray(list)) return false
  return anyMatch ? list.some(test) : list.every(test)
}

const regexOf = (
  ctx: FilterContext,
  node: ColumnFilterNode,
  pattern: string,
): RegExp | undefined => {
  let regex = ctx.regexes.get(node)
  if (regex === undefined) {
    regex = compileRegex(pattern, node.caseSensitive)
    ctx.regexes.set(node, regex)
  }
  return regex instanceof RegExp ? regex : undefined
}

const acceptsColumn = (
  ctx: FilterContext,
  node: ColumnFilterNode,
  id: IdType,
  kind: FilterElementKind,
): boolean => {
  const { columnName, predicate, criterion, caseSensitive, anyMatch } = node
  if (columnName === null || predicate === null || criterion === null) {
    return false
  }
  if (!appliesTo(node, kind)) return false

  const isNode = kind === FilterElementKind.NODE
  const columnType = (isNode ? ctx.nodeColumnTypes : ctx.edgeColumnTypes).get(
    columnName,
  )
  if (columnType === undefined) return false
  const table = isNode ? ctx.nodeTable : ctx.edgeTable
  const value = cellValue(table, id, columnName)
  const isList = columnType.startsWith('list_of_')

  // A criterion of the wrong kind for the column rejects every element.
  // (Cytoscape Desktop reports it as a validation warning, and its result
  // then depends on the predicate.)
  switch (columnKindOf(columnType)) {
    case 'string': {
      if (typeof criterion !== 'string') return false
      const regex =
        predicate === FilterPredicate.REGEX
          ? regexOf(ctx, node, criterion)
          : undefined
      const test = (item: unknown): boolean =>
        stringAccepts(
          predicate,
          criterion,
          caseSensitive,
          asString(item),
          regex,
        )
      return isList ? listMatch(anyMatch, value, test) : test(value)
    }
    case 'number': {
      const bounds = toNumericBounds(criterion)
      if (bounds === null) return false
      const test = (item: unknown): boolean =>
        numericAccepts(predicate, bounds[0], bounds[1], asNumber(item))
      return isList ? listMatch(anyMatch, value, test) : test(value)
    }
    case 'boolean':
      if (typeof criterion !== 'boolean') return false
      // The predicate is ignored, as in Cytoscape Desktop; a list passes
      // when any element equals the criterion
      return isList
        ? Array.isArray(value) && value.some((item) => item === criterion)
        : value === criterion
    default:
      return false
  }
}

const acceptsDegree = (
  ctx: FilterContext,
  node: DegreeFilterNode,
  id: IdType,
  kind: FilterElementKind,
): boolean => {
  if (kind !== FilterElementKind.NODE) return false
  if (node.criterion === null) return true
  if (node.predicate === null) return false
  const degree = degreeOf(adjacencyOf(ctx), id, node.edgeType)
  return numericAccepts(
    node.predicate,
    node.criterion[0],
    node.criterion[1],
    degree,
  )
}

/**
 * Count the distinct nodes within `distance` hops of `startId`, ignoring
 * edge direction and excluding the start node, that pass the neighbour
 * conditions. Nodes on the way need not pass. Counting stops at `limit`,
 * which already decides the result.
 */
const countNeighbours = (
  ctx: FilterContext,
  node: TopologyFilterNode,
  neighbours: CompositeFilterNode,
  startId: IdType,
  distance: number,
  limit: number,
): number => {
  const results: Map<IdType, boolean> =
    ctx.neighbourResults.get(node) ?? new Map<IdType, boolean>()
  ctx.neighbourResults.set(node, results)
  const passes = (id: IdType): boolean => {
    let result = results.get(id)
    if (result === undefined) {
      result = acceptsComposite(ctx, neighbours, id, FilterElementKind.NODE)
      results.set(id, result)
    }
    return result
  }

  if (limit <= 0) return 0
  const adjacency = adjacencyOf(ctx)
  const visited = new Set<IdType>([startId])
  let frontier: IdType[] = [startId]
  let count = 0
  for (let hop = 0; hop < distance && frontier.length > 0; hop++) {
    const next: IdType[] = []
    for (const id of frontier) {
      for (const edge of adjacency.get(id)?.any ?? []) {
        const other = edge.s === id ? edge.t : edge.s
        if (visited.has(other)) continue
        visited.add(other)
        next.push(other)
        if (passes(other)) {
          count++
          if (count >= limit) return count
        }
      }
    }
    frontier = next
  }
  return count
}

const acceptsTopology = (
  ctx: FilterContext,
  node: TopologyFilterNode,
  id: IdType,
  kind: FilterElementKind,
): boolean => {
  const { distance, threshold, predicate } = node
  if (kind !== FilterElementKind.NODE) return false
  if (distance === null || threshold === null || predicate === null) {
    return false
  }
  const neighbours: CompositeFilterNode = {
    type: FilterTypeId.Composite,
    matchType: node.matchType,
    children: node.children,
  }
  const count = isAlwaysFalse(neighbours)
    ? 0
    : countNeighbours(ctx, node, neighbours, id, distance, threshold)
  return numericAccepts(predicate, threshold, threshold, count)
}

const acceptsComposite = (
  ctx: FilterContext,
  node: CompositeFilterNode,
  id: IdType,
  kind: FilterElementKind,
): boolean => {
  if (node.children.length === 0) return true
  const all = node.matchType === MatchType.ALL
  for (const child of node.children) {
    if (accepts(ctx, child, id, kind) !== all) {
      return !all
    }
  }
  return all
}

/**
 * Whether an element passes a condition
 *
 * @param id Id of the node or edge
 * @param kind Whether `id` is a node or an edge
 */
export const accepts = (
  ctx: FilterContext,
  node: FilterNode,
  id: IdType,
  kind: FilterElementKind,
): boolean => {
  switch (node.type) {
    case FilterTypeId.Composite:
      return acceptsComposite(ctx, node, id, kind)
    case FilterTypeId.Column:
      return acceptsColumn(ctx, node, id, kind)
    case FilterTypeId.Degree:
      return acceptsDegree(ctx, node, id, kind)
    case FilterTypeId.Topology:
      return acceptsTopology(ctx, node, id, kind)
    default:
      return false
  }
}

/**
 * Run a filter over every node and edge of the context's network.
 *
 * - `SELECT`: the elements that pass, to become the selection. A node-only
 *   filter returns no edge, so applying it deselects every edge.
 * - `SHOW_HIDE`: the elements to keep visible: those that pass, plus those
 *   the filter is not about (`appliesTo`).
 *
 * @returns Undefined for a filter without conditions: applying it changes
 *   nothing, as in Cytoscape Desktop
 */
export const evaluateFilter = (
  ctx: FilterContext,
  root: CompositeFilterNode,
  displayMode: DisplayMode,
): FilterResult | undefined => {
  if (root.children.length === 0) return undefined
  const show = displayMode === DisplayMode.SHOW_HIDE
  // In show mode, every element of a kind the filter is not about stays
  const keepAllNodes = show && !appliesTo(root, FilterElementKind.NODE)
  const keepAllEdges = show && !appliesTo(root, FilterElementKind.EDGE)

  const nodeIds: IdType[] = []
  const edgeIds: IdType[] = []
  ctx.network.nodes.forEach((node) => {
    if (keepAllNodes || accepts(ctx, root, node.id, FilterElementKind.NODE)) {
      nodeIds.push(node.id)
    }
  })
  ctx.network.edges.forEach((edge) => {
    if (keepAllEdges || accepts(ctx, root, edge.id, FilterElementKind.EDGE)) {
      edgeIds.push(edge.id)
    }
  })
  return { nodeIds, edgeIds }
}
