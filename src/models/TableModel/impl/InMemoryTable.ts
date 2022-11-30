import { Column, Table } from '..'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { Node } from '../../../utils/cx/Cx2/CoreAspects/Node'
import { IdType } from '../../IdType'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'
import { CxValue } from '../../../utils/cx/Cx2/CxValue'
import { AttributeDeclaration } from '../../../utils/cx/Cx2/CoreAspects/AttributeDeclarations'

export const createTable = (id: IdType): Table => ({
  id,
  columns: new Map<AttributeName, Column>(),
  rows: new Map<IdType, Record<AttributeName, ValueType>>(),
})

// a particular row may not have a value associated with it and a column may not define the default value
// in such cases fallback to the model defined default value
export const valueTypeDefaults: Record<ValueTypeName, ValueType> = {
  list_of_boolean: [],
  list_of_double: [],
  list_of_integer: [],
  list_of_long: [],
  list_of_string: [],
  string: '',
  long: 0,
  integer: 0,
  double: 0.0,
  boolean: false,
}

export const createTablesFromCx = (id: IdType, cx: Cx2): [Table, Table] => {
  const nodeTable = createTable(`${id}-nodes`)
  const edgeTable = createTable(`${id}-edges`)

  const nodeAttr: Map<
    string,
    Record<string, CxValue>
  > = cxUtil.getNodeAttributes(cx)
  const edgeAttr: Map<
    string,
    Record<string, CxValue>
  > = cxUtil.getEdgeAttributes(cx)

  // append position specific data to columns/rows
  const positionXKey = 'positionX' // todo this can conflict with exiting property keys
  // generate a unique key for position and also need some thought into where positions should go
  const positionYKey = 'positionY'
  const cxIdKey = 'cxId'

  // Columns
  const attrDec = cxUtil.getAttributeDeclarations(cx)
  const attrDefs: AttributeDeclaration = attrDec.attributeDeclarations[0]

  Object.entries(attrDefs.nodes).forEach(([attrName, attrDef]) => {
    const columnDef: Column = {
      type: attrDef.d as ValueTypeName,
      name: attrName,
      defaultValue: (attrDef.v ?? valueTypeDefaults[attrDef.d]) as ValueType,
      ...(attrDef.a != null ? { alias: attrDef.a } : {}),
    }

    nodeTable.columns.set(attrName, columnDef)
  })
  nodeTable.columns.set(positionXKey, {
    type: 'double',
    name: positionXKey,
    defaultValue: 0.0,
  })
  nodeTable.columns.set(positionYKey, {
    type: 'double',
    name: positionYKey,
    defaultValue: 0.0,
  })
  nodeTable.columns.set(cxIdKey, {
    type: 'string',
    name: cxIdKey,
    defaultValue: '',
  })

  Object.entries(attrDefs.edges).forEach(([attrName, attrDef]) => {
    const columnDef = {
      type: attrDef.d as ValueTypeName,
      name: attrName,
      defaultValue: (attrDef.v ?? valueTypeDefaults[attrDef.d]) as ValueType,
      ...(attrDef.a != null ? { alias: attrDef.a } : {}),
    }

    edgeTable.columns.set(attrName, columnDef)
  })
  edgeTable.columns.set(cxIdKey, {
    type: 'string',
    name: cxIdKey,
    defaultValue: '',
  })

  // Rows
  const cxNodes: Node[] = cxUtil.getNodes(cx)

  nodeAttr.forEach((attr, nodeId) => {
    const posX = (cxNodes[+nodeId]?.x ?? 0) as ValueType
    const posY = (cxNodes[+nodeId]?.y ?? 0) as ValueType
    attr[positionXKey] = posX
    attr[positionYKey] = posY
    attr[cxIdKey] = nodeId
    nodeTable.rows.set(nodeId, attr as Record<AttributeName, ValueType>)
  })

  edgeAttr.forEach((attr, edgeId) => {
    attr[cxIdKey] = edgeId
    edgeTable.rows.set(edgeId, attr as Record<AttributeName, ValueType>)
  })

  return [nodeTable, edgeTable]
}
// Utility function to get list of columns from a table
export const columns = (table: Table): Column[] =>
  Array.from(table.columns.values())

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
