import type { IdType } from '../../IdType'
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
  id: IdType,
  name: string,
  displayMode: DisplayMode = DisplayMode.SELECT,
): WorkspaceFilter => ({
  id,
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
// Moving conditions (drag and drop)
// ---------------------------------------------------------------------------

/**
 * Where a dragged condition is dropped, as in Cytoscape Desktop's Filter
 * panel (AbstractPanelController.handleFilterDrop):
 *
 * - `gap`: between two conditions of a group (or a topology condition's
 *   neighbour conditions): the condition moves there. `index` is the
 *   position, in the parent as it is before the move, of the condition the
 *   gap comes before; the parent's child count is the gap after the last.
 * - `group`: onto a group or a topology condition: added at its end.
 * - `condition`: onto another condition: both go into a new "match all"
 *   group, in the target's place, the target first.
 */
export type ConditionDropTarget =
  | {
      readonly kind: 'gap'
      readonly parentPath: FilterNodePath
      readonly index: number
    }
  | { readonly kind: 'group'; readonly path: FilterNodePath }
  | { readonly kind: 'condition'; readonly path: FilterNodePath }

const isPrefix = (prefix: FilterNodePath, path: FilterNodePath): boolean =>
  prefix.length <= path.length && prefix.every((index, i) => path[i] === index)

/**
 * Whether dropping the condition at `sourcePath` on `target` would change
 * the filter. Refused: moving the root, dropping a condition into itself or
 * its own conditions, a gap next to the condition itself, a group target that
 * is not a group, a condition target that is a group (that is a group target),
 * and paths that lead nowhere.
 */
export const canDropCondition = (
  root: CompositeFilterNode,
  sourcePath: FilterNodePath,
  target: ConditionDropTarget,
): boolean => {
  if (sourcePath.length === 0 || getNodeAt(root, sourcePath) === undefined) {
    return false
  }
  const sourceParentPath = sourcePath.slice(0, -1)
  const sourceIndex = sourcePath[sourcePath.length - 1]
  switch (target.kind) {
    case 'gap': {
      const parent = getNodeAt(root, target.parentPath)
      if (
        parent === undefined ||
        !isParentNode(parent) ||
        !Number.isInteger(target.index) ||
        target.index < 0 ||
        target.index > parent.children.length ||
        isPrefix(sourcePath, target.parentPath)
      ) {
        return false
      }
      // The gaps right before and after the condition leave it in place
      const sameParent =
        sourceParentPath.length === target.parentPath.length &&
        isPrefix(sourceParentPath, target.parentPath)
      return !(
        sameParent &&
        (target.index === sourceIndex || target.index === sourceIndex + 1)
      )
    }
    case 'group': {
      const group = getNodeAt(root, target.path)
      if (
        group === undefined ||
        !isParentNode(group) ||
        isPrefix(sourcePath, target.path)
      ) {
        return false
      }
      // Already the group's last condition: it would stay where it is
      const isOwnGroup =
        target.path.length === sourceParentPath.length &&
        isPrefix(target.path, sourceParentPath)
      return !(isOwnGroup && sourceIndex === group.children.length - 1)
    }
    case 'condition': {
      const node = getNodeAt(root, target.path)
      return (
        node !== undefined &&
        !isParentNode(node) &&
        !isPrefix(sourcePath, target.path)
      )
    }
  }
}

// A mutable copy of a filter tree, so a move can find nodes by identity
// while the tree around them changes
interface MovableNode {
  node: FilterNode
  children: MovableNode[]
}

const toMovable = (node: FilterNode): MovableNode => ({
  node,
  children: isParentNode(node) ? node.children.map(toMovable) : [],
})

const fromMovable = (movable: MovableNode): FilterNode =>
  isParentNode(movable.node)
    ? { ...movable.node, children: movable.children.map(fromMovable) }
    : movable.node

const movableAt = (
  root: MovableNode,
  path: FilterNodePath,
): MovableNode | undefined => {
  let current: MovableNode | undefined = root
  for (const index of path) {
    current = current?.children[index]
  }
  return current
}

const parentOf = (
  root: MovableNode,
  child: MovableNode,
): MovableNode | undefined => {
  if (root.children.includes(child)) return root
  for (const node of root.children) {
    const found = parentOf(node, child)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * Move the condition at `sourcePath` to `target` (see ConditionDropTarget).
 * A nested group left empty by the move is removed, and so on up the tree,
 * as in Cytoscape Desktop. Returns the root unchanged when the drop is not
 * allowed (canDropCondition).
 */
export const moveCondition = (
  root: CompositeFilterNode,
  sourcePath: FilterNodePath,
  target: ConditionDropTarget,
): CompositeFilterNode => {
  if (!canDropCondition(root, sourcePath, target)) return root

  const tree = toMovable(root)
  const source = movableAt(tree, sourcePath)!
  const oldParent = movableAt(tree, sourcePath.slice(0, -1))!
  // Resolve the target before anything moves: the paths describe the tree
  // as it is now
  const targetNode =
    target.kind === 'gap'
      ? movableAt(tree, target.parentPath)!
      : movableAt(tree, target.path)!
  // For a gap, the condition the gap comes before (undefined: the end)
  const beforeNode =
    target.kind === 'gap' ? targetNode.children[target.index] : undefined

  oldParent.children.splice(oldParent.children.indexOf(source), 1)

  switch (target.kind) {
    case 'gap': {
      const at =
        beforeNode === undefined
          ? targetNode.children.length
          : targetNode.children.indexOf(beforeNode)
      targetNode.children.splice(at, 0, source)
      break
    }
    case 'group':
      targetNode.children.push(source)
      break
    case 'condition': {
      const parent = parentOf(tree, targetNode)!
      const group: MovableNode = {
        node: createCompositeFilter(MatchType.ALL),
        children: [targetNode, source],
      }
      parent.children.splice(parent.children.indexOf(targetNode), 1, group)
      break
    }
  }

  // Remove the groups the move emptied, but never the root or a topology
  // condition
  let emptied: MovableNode | undefined = oldParent
  while (
    emptied !== undefined &&
    emptied !== tree &&
    emptied.node.type === FilterTypeId.Composite &&
    emptied.children.length === 0
  ) {
    const parent = parentOf(tree, emptied)
    parent?.children.splice(parent.children.indexOf(emptied), 1)
    emptied = parent
  }

  return fromMovable(tree) as CompositeFilterNode
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
