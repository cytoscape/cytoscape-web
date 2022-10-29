import { Column, Table } from '..'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { IdType } from '../../IdType'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'
import { CxValue } from '../../../utils/cx/Cx2/CxValue'
import { AttributeDeclaration } from '../../../utils/cx/Cx2/CoreAspects/AttributeDeclarations'

export const createTable = (id: IdType): Table => ({
  id,
  columns: new Map<AttributeName, ValueTypeName>(),
  rows: new Map<IdType, Record<AttributeName, ValueType>>(),
})

export const createTablesFromCx = (id: IdType, cx: Cx2): [Table, Table] => {
  const nodeTable = createTable(id)
  const edgeTable = createTable(id)

  const nodeAttr: Map<
    string,
    Record<string, CxValue>
  > = cxUtil.getNodeAttributes(cx)
  const edgeAttr: Map<
    string,
    Record<string, CxValue>
  > = cxUtil.getEdgeAttributes(cx)

  nodeAttr.forEach((attr, nodeId) => {
    nodeTable.rows.set(nodeId, attr as Record<AttributeName, ValueType>)
  })

  edgeAttr.forEach((attr, edgeId) => {
    edgeTable.rows.set(edgeId, attr as Record<AttributeName, ValueType>)
  })

  // Columns
  const attrDec = cxUtil.getAttributeDeclarations(cx)
  const attrDefs: AttributeDeclaration = attrDec.attributeDeclarations[0]
  const { nodes, edges } = attrDefs

  const nodeAttrNames: string[] = Object.keys(nodes)
  const edgeAttrNames = Object.keys(edges)

  nodeAttrNames.forEach((attrName) => {
    nodeTable.columns.set(attrName, nodes[attrName].d as ValueTypeName)
  })
  edgeAttrNames.forEach((attrName) => {
    edgeTable.columns.set(attrName, edges[attrName].d as ValueTypeName)
  })

  return [nodeTable, edgeTable]
}
// Utility function to get list of columns from a table
export const columns = (table: Table): Column[] =>
  [...table.columns.keys()].map((name: AttributeName) => ({
    name,
    type: table.columns.get(name) as ValueTypeName,
  }))

export const addColumn = (table: Table, columns: Column[]): Table => {
  // const newColumns: Column[] = [...table.columns, ...columns]
  // table.columns = newColumns
  return table
}

export const columnValueSet = (
  table: Table,
  columnName: string,
): Set<ValueType> => {
  const values = new Set<ValueType>()
  table.rows.forEach((row) => {
    values.add(row[columnName])
  })
  return values
}

export const insertRow = (
  table: Table,
  idRowPair: [IdType, Record<AttributeName, ValueType>],
): Table => {
  table.rows.set(idRowPair[0], idRowPair[1])
  return table
}

export const insertRows = (
  table: Table,
  idRowPairs: Array<[IdType, Record<AttributeName, ValueType>]>,
): Table => {
  idRowPairs.forEach((idRow) => table.rows.set(idRow[0], idRow[1]))
  return table
}