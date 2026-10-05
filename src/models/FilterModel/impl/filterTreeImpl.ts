import type { Network } from '../../NetworkModel/Network'
import type { NumberRange } from '../../PropertyModel/NumberRange'
import type { Column } from '../../TableModel/Column'
import type { Table } from '../../TableModel/Table'
import { ValueTypeName } from '../../TableModel/ValueTypeName'
import { DisplayMode } from '../DisplayMode'
import {
  ColumnFilterNode,
  ColumnFilterTarget,
  CompositeFilterNode,
  DegreeEdgeType,
  DegreeFilterNode,
  FilterNode,
  FilterNodePath,
  FilterPredicate,
  FilterTypeId,
  MatchType,
  NamedFilter,
  ParentFilterNode,
  TopologyFilterNode,
  WorkspaceFilter,
} from '../FilterTree'
import { buildAdjacency, degreeOf } from './adjacency'

/**
 * Pure functions to build and edit filters of the FILTER tab. Every edit
 * returns a new tree and leaves its input untouched.
 */

// ---------------------------------------------------------------------------
// New conditions, with Cytoscape Desktop's defaults
// ---------------------------------------------------------------------------

export const createCompositeFilter = (
  matchType: MatchType = MatchType.ALL,
  children: readonly FilterNode[] = [],
): CompositeFilterNode => ({
  type: FilterTypeId.Composite,
  matchType,
  children,
})

/**
 * A column condition with no column picked yet. It rejects every element
 * until a column, predicate and criterion are set.
 */
export const createColumnFilter = (): ColumnFilterNode => ({
  type: FilterTypeId.Column,
  columnName: null,
  target: ColumnFilterTarget.NODES,
  predicate: null,
  criterion: null,
  caseSensitive: false,
  anyMatch: true,
})

/**
 * A degree condition with no range yet. It accepts every node until one is
 * set.
 */
export const createDegreeFilter = (): DegreeFilterNode => ({
  type: FilterTypeId.Degree,
  edgeType: DegreeEdgeType.ANY,
  predicate: FilterPredicate.BETWEEN,
  criterion: null,
})

/**
 * A topology condition with no distance or threshold yet. It rejects every
 * node until both are set.
 */
export const createTopologyFilter = (): TopologyFilterNode => ({
  type: FilterTypeId.Topology,
  predicate: FilterPredicate.GREATER_THAN_OR_EQUAL,
  distance: null,
  threshold: null,
  matchType: MatchType.ALL,
  children: [],
})

export const createNamedFilter = (name: string): NamedFilter => ({
  name,
  root: createCompositeFilter(),
})

export const createWorkspaceFilter = (
  name: string,
  displayMode: DisplayMode = DisplayMode.SELECT,
): WorkspaceFilter => ({
  ...createNamedFilter(name),
  displayMode,
})

const isNumericType = (type: ValueTypeName): boolean =>
  type === ValueTypeName.Integer ||
  type === ValueTypeName.Long ||
  type === ValueTypeName.Double

/**
 * The element type of a list column, or the column's own type
 */
export const elementTypeOf = (type: ValueTypeName): ValueTypeName => {
  switch (type) {
    case ValueTypeName.ListString:
      return ValueTypeName.String
    case ValueTypeName.ListInteger:
      return ValueTypeName.Integer
    case ValueTypeName.ListLong:
      return ValueTypeName.Long
    case ValueTypeName.ListDouble:
      return ValueTypeName.Double
    case ValueTypeName.ListBoolean:
      return ValueTypeName.Boolean
    default:
      return type
  }
}

/**
 * The comparison family of a column: what its cells (or list elements) hold
 */
export type ColumnKind = 'string' | 'number' | 'boolean'

export const columnKindOf = (type: ValueTypeName): ColumnKind | undefined => {
  const elementType = elementTypeOf(type)
  if (elementType === ValueTypeName.String) return 'string'
  if (elementType === ValueTypeName.Boolean) return 'boolean'
  if (isNumericType(elementType)) return 'number'
  return undefined
}

/**
 * A column condition for a column just picked, with the defaults Cytoscape
 * Desktop sets: `is true` for booleans, the column's whole range for numbers
 * (so every element passes), and `contains ""` for text.
 *
 * @param range The column's value range, for a numeric column; [0, 0] when
 *   the column has no values
 */
export const columnFilterFor = (
  column: Column,
  target: typeof ColumnFilterTarget.NODES | typeof ColumnFilterTarget.EDGES,
  range?: NumberRange,
): ColumnFilterNode => {
  const base: ColumnFilterNode = {
    ...createColumnFilter(),
    columnName: column.name,
    target,
  }
  switch (columnKindOf(column.type)) {
    case 'boolean':
      return { ...base, predicate: FilterPredicate.IS, criterion: true }
    case 'number':
      return {
        ...base,
        predicate: FilterPredicate.BETWEEN,
        criterion: [range?.min ?? 0, range?.max ?? 0],
      }
    case 'string':
      return { ...base, predicate: FilterPredicate.CONTAINS, criterion: '' }
    default:
      return base
  }
}

// ---------------------------------------------------------------------------
// Edits by path
// ---------------------------------------------------------------------------

export const isParentNode = (node: FilterNode): node is ParentFilterNode =>
  node.type === FilterTypeId.Composite || node.type === FilterTypeId.Topology

/**
 * The condition at a path, or undefined when the path leads nowhere
 */
export const getNodeAt = (
  root: CompositeFilterNode,
  path: FilterNodePath,
): FilterNode | undefined => {
  let node: FilterNode = root
  for (const index of path) {
    if (!isParentNode(node) || !Number.isInteger(index)) return undefined
    const child: FilterNode | undefined = node.children[index]
    if (child === undefined) return undefined
    node = child
  }
  return node
}

const updateAt = (
  node: FilterNode,
  path: FilterNodePath,
  update: (target: FilterNode) => FilterNode,
): FilterNode => {
  if (path.length === 0) return update(node)
  if (!isParentNode(node)) return node
  const [index, ...rest] = path
  const child = node.children[index]
  if (child === undefined) return node
  const children = [...node.children]
  children[index] = updateAt(child, rest, update)
  return { ...node, children }
}

/**
 * Replace the condition at a path. The root can only be replaced by a group;
 * a path that leads nowhere leaves the filter unchanged.
 */
export const replaceNodeAt = (
  root: CompositeFilterNode,
  path: FilterNodePath,
  node: FilterNode,
): CompositeFilterNode => {
  if (path.length === 0) {
    return node.type === FilterTypeId.Composite ? node : root
  }
  return updateAt(root, path, () => node) as CompositeFilterNode
}

/**
 * Add a condition at the end of the group (or topology condition) at
 * `parentPath`
 */
export const appendChild = (
  root: CompositeFilterNode,
  parentPath: FilterNodePath,
  child: FilterNode,
): CompositeFilterNode =>
  updateAt(root, parentPath, (parent) =>
    isParentNode(parent)
      ? { ...parent, children: [...parent.children, child] }
      : parent,
  ) as CompositeFilterNode

/**
 * Set how the group (or topology condition) at a path combines its
 * conditions
 */
export const setMatchType = (
  root: CompositeFilterNode,
  path: FilterNodePath,
  matchType: MatchType,
): CompositeFilterNode =>
  updateAt(root, path, (node) =>
    isParentNode(node) ? { ...node, matchType } : node,
  ) as CompositeFilterNode

/**
 * Put the condition at a path into a new group of its own
 */
export const wrapInGroup = (
  root: CompositeFilterNode,
  path: FilterNodePath,
  matchType: MatchType = MatchType.ALL,
): CompositeFilterNode => {
  if (path.length === 0) return root
  return updateAt(root, path, (node) =>
    createCompositeFilter(matchType, [node]),
  ) as CompositeFilterNode
}

/**
 * Remove the condition at a path. A nested group left empty by the removal
 * goes too, and so on up the tree (Cytoscape Desktop's `removeOrphans`);
 * the root and topology conditions stay, even when empty. The root cannot be
 * removed.
 */
export const removeNodeAt = (
  root: CompositeFilterNode,
  path: FilterNodePath,
): CompositeFilterNode => {
  if (path.length === 0 || getNodeAt(root, path) === undefined) return root
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  const removed = updateAt(root, parentPath, (parent) =>
    isParentNode(parent)
      ? { ...parent, children: parent.children.filter((_, i) => i !== index) }
      : parent,
  ) as CompositeFilterNode
  const parent = getNodeAt(removed, parentPath)
  if (
    parentPath.length > 0 &&
    parent?.type === FilterTypeId.Composite &&
    parent.children.length === 0
  ) {
    return removeNodeAt(removed, parentPath)
  }
  return removed
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * Trim a filter name. Undefined when nothing is left.
 */
export const normalizeFilterName = (name: string): string | undefined => {
  const trimmed = name.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Whether a name is used already. Names are compared ignoring case, as in
 * Cytoscape Desktop.
 */
export const isNameTaken = (
  names: readonly string[],
  name: string,
): boolean => {
  const lower = name.toLowerCase()
  return names.some((existing) => existing.toLowerCase() === lower)
}

/**
 * The name itself when it is free, otherwise the first free "name N" from 2
 */
export const uniqueFilterName = (
  names: readonly string[],
  name: string,
): string => {
  if (!isNameTaken(names, name)) return name
  let suffix = 2
  while (isNameTaken(names, `${name} ${suffix}`)) {
    suffix++
  }
  return `${name} ${suffix}`
}

// ---------------------------------------------------------------------------
// Value ranges, for slider bounds
// ---------------------------------------------------------------------------

/**
 * The smallest and largest number in a column, list elements included.
 * NaN, infinite and missing values are skipped. Undefined when the column
 * holds no number.
 */
export const computeColumnRange = (
  table: Table,
  columnName: string,
): NumberRange | undefined => {
  let min = Infinity
  let max = -Infinity
  const visit = (value: unknown): void => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  table.rows.forEach((row) => {
    if (!Object.hasOwn(row, columnName)) return
    const value: unknown = row[columnName]
    if (Array.isArray(value)) {
      value.forEach(visit)
    } else {
      visit(value)
    }
  })
  return min === Infinity ? undefined : { min, max }
}

/**
 * The smallest and largest node degree of the given direction. [0, 0] for a
 * network without nodes.
 */
export const computeDegreeRange = (
  network: Network,
  edgeType: DegreeEdgeType,
): NumberRange => {
  if (network.nodes.length === 0) return { min: 0, max: 0 }
  const adjacency = buildAdjacency(network)
  let min = Infinity
  let max = -Infinity
  network.nodes.forEach((node) => {
    const degree = degreeOf(adjacency, node.id, edgeType)
    if (degree < min) min = degree
    if (degree > max) max = degree
  })
  return { min, max }
}
