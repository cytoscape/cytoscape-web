import { Column, Table } from '..'
import { Cx2 } from '../../../utils/cx/Cx2'
import * as cxUtil from '../../../utils/cx/cx2-util'
import { IdType } from '../../IdType'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'
import { CxValue } from '../../../utils/cx/Cx2/CxValue'
import { AttributeDeclaration } from '../../../utils/cx/Cx2/CoreAspects/AttributeDeclarations'
import { translateCXEdgeId } from '../../NetworkModel/impl/CyNetwork'
export const createTable = (id: IdType): Table => ({
  id,
  columns: new Map<AttributeName, Column>(),
  rows: new Map<IdType, Record<AttributeName, ValueType>>(),
})

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

  // Columns
  const attrDec = cxUtil.getAttributeDeclarations(cx)
  const attrDefs: AttributeDeclaration = attrDec.attributeDeclarations[0]

  // Map column aliases to their original names
  const nodeAttributeTranslationMap: Record<string, string> = {}
  const edgeAttributeTranslationMap: Record<string, string> = {}

  Object.entries(attrDefs.nodes).forEach(([attrName, attrDef]) => {
    const columnDef: Column = {
      type: attrDef.d as ValueTypeName,
      name: attrName,
    }

    if (attrDef.a != null) {
      nodeAttributeTranslationMap[attrDef.a] = attrName
    }

    nodeTable.columns.set(attrName, columnDef)
  })

  Object.entries(attrDefs.edges).forEach(([attrName, attrDef]) => {
    const columnDef = {
      type: attrDef.d as ValueTypeName,
      name: attrName,
    }

    if (attrDef.a != null) {
      edgeAttributeTranslationMap[attrDef.a] = attrName
    }

    edgeTable.columns.set(attrName, columnDef)
  })

  nodeAttr.forEach((attr, nodeId) => {
    const processedAttributes: Record<AttributeName, ValueType> = {}

    Object.entries(attrDefs.nodes).forEach(([key, value]) => {
      if (value.v != null) {
        processedAttributes[key] = value.v as ValueType
      }
    })

    Object.entries(attr).forEach(([attrName, attrValue]) => {
      const translatedAttrName =
        nodeAttributeTranslationMap[attrName] ?? attrName

      const value: ValueType = attrValue as ValueType

      processedAttributes[translatedAttrName] = value
    })
    nodeTable.rows.set(nodeId, processedAttributes)
  })

  edgeAttr.forEach((attr, edgeId) => {
    const processedAttributes: Record<string, ValueType> = {}
    const translatedEdgeId = translateCXEdgeId(edgeId)

    Object.entries(attrDefs.edges).forEach(([key, value]) => {
      if (value.v != null) {
        processedAttributes[key] = value.v as ValueType
      }
    })

    Object.entries(attr).forEach(([attrName, attrValue]) => {
      const translatedAttrName =
        edgeAttributeTranslationMap[attrName] ?? attrName

      const value: ValueType = attrValue as ValueType

      processedAttributes[translatedAttrName] = value
    })
    edgeTable.rows.set(translatedEdgeId, processedAttributes)
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
  includeNullOrUndefined = false,
): Set<ValueType> => {
  const values = new Set<ValueType>()
  table.rows.forEach((row) => {
    const value = row[columnName]

    if (value != null) {
      values.add(value)
    } else if (includeNullOrUndefined) {
      values.add(value)
    }
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
