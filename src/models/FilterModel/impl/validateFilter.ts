import type { Table } from '../../TableModel/Table'
import {
  ColumnFilterNode,
  ColumnFilterTarget,
  FilterNode,
  FilterNodePath,
  FilterPredicate,
  FilterTypeId,
} from '../FilterTree'
import { columnKindOf, ColumnKind } from './filterTreeImpl'
import {
  compileRegex,
  isNumericPredicate,
  isStringPredicate,
  toNumericBounds,
} from './predicates'

/**
 * A problem that keeps a condition from working on a network, shown next to
 * the condition in the FILTER tab
 */
export interface FilterValidationWarning {
  // The condition the warning is about
  readonly path: FilterNodePath
  readonly message: string
}

const KIND_LABEL: Record<ColumnKind, string> = {
  string: 'String',
  number: 'Numeric',
  boolean: 'Boolean',
}

const criterionFits = (
  kind: ColumnKind,
  criterion: ColumnFilterNode['criterion'],
): boolean => {
  switch (kind) {
    case 'string':
      return typeof criterion === 'string'
    case 'number':
      return toNumericBounds(criterion) !== null
    case 'boolean':
      return typeof criterion === 'boolean'
  }
}

const predicateFits = (
  kind: ColumnKind,
  predicate: FilterPredicate,
): boolean => {
  switch (kind) {
    case 'string':
      return isStringPredicate(predicate)
    case 'number':
      return isNumericPredicate(predicate)
    case 'boolean':
      // Boolean columns ignore the predicate
      return true
  }
}

const validateColumn = (
  node: ColumnFilterNode,
  path: FilterNodePath,
  nodeTable: Table,
  edgeTable: Table,
): FilterValidationWarning[] => {
  const { columnName, predicate, criterion } = node
  // As in Cytoscape Desktop, a condition on both tables is not checked
  if (
    columnName === null ||
    node.target === ColumnFilterTarget.NODES_AND_EDGES
  ) {
    return []
  }
  const isNode = node.target === ColumnFilterTarget.NODES
  const tableLabel = isNode ? 'Node' : 'Edge'
  const column = (isNode ? nodeTable : edgeTable).columns.find(
    (candidate) => candidate.name === columnName,
  )
  if (column === undefined) {
    return [
      {
        path,
        message: `${tableLabel} table does not have column "${columnName}"`,
      },
    ]
  }
  // An incomplete condition is not an error yet
  if (predicate === null || criterion === null) return []

  const kind = columnKindOf(column.type)
  if (kind === undefined) {
    return [
      {
        path,
        message: `Column "${columnName}" in ${tableLabel} table has an unsupported type`,
      },
    ]
  }
  const columnLabel = `Column "${columnName}" in ${tableLabel} table`
  if (!criterionFits(kind, criterion) || !predicateFits(kind, predicate)) {
    return [
      {
        path,
        message: `${columnLabel} is a ${KIND_LABEL[kind]} column, which this condition cannot compare`,
      },
    ]
  }
  if (predicate === FilterPredicate.REGEX && typeof criterion === 'string') {
    const regex = compileRegex(criterion, node.caseSensitive)
    if (regex instanceof Error) {
      return [{ path, message: `Invalid regular expression: ${regex.message}` }]
    }
  }
  return []
}

const validateNode = (
  node: FilterNode,
  path: FilterNodePath,
  nodeTable: Table,
  edgeTable: Table,
): FilterValidationWarning[] => {
  switch (node.type) {
    case FilterTypeId.Column:
      return validateColumn(node, path, nodeTable, edgeTable)
    case FilterTypeId.Degree:
      return []
    case FilterTypeId.Topology: {
      const warnings: FilterValidationWarning[] = []
      if (node.distance !== null && node.distance < 1) {
        warnings.push({ path, message: 'Distance must be at least 1' })
      }
      if (node.threshold !== null && node.threshold < 0) {
        warnings.push({ path, message: 'Threshold must not be negative' })
      }
      return [
        ...warnings,
        ...validateChildren(node.children, path, nodeTable, edgeTable),
      ]
    }
    case FilterTypeId.Composite:
      return validateChildren(node.children, path, nodeTable, edgeTable)
    default:
      return []
  }
}

const validateChildren = (
  children: readonly FilterNode[],
  path: FilterNodePath,
  nodeTable: Table,
  edgeTable: Table,
): FilterValidationWarning[] =>
  children.flatMap((child, index) =>
    validateNode(child, [...path, index], nodeTable, edgeTable),
  )

/**
 * Check a filter against the tables of the network it is applied to. A
 * condition with a warning rejects every element there.
 *
 * @returns One warning per problem, each with the path of its condition
 */
export const validateFilter = (
  root: FilterNode,
  nodeTable: Table,
  edgeTable: Table,
): FilterValidationWarning[] => validateNode(root, [], nodeTable, edgeTable)
