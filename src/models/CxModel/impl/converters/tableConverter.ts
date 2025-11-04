/**
 * Table Model Converter from CX2
 *
 * Converts CX2 format data to TableModel.
 */
import { Column, Table } from '../../../TableModel'
import { Cx2 } from '../../Cx2'
import * as cxUtil from '../extractor'
import { IdType } from '../../../IdType'
import { AttributeName } from '../../../TableModel/AttributeName'
import { ValueType } from '../../../TableModel/ValueType'
import { ValueTypeName } from '../../../TableModel/ValueTypeName'
import { CxValue } from '../../Cx2/CxValue'
import { AttributeDeclaration } from '../../Cx2/CoreAspects/AttributeDeclarations'
import { translateCXEdgeId } from './networkConverter'
import { createTable } from '../../../TableModel/impl/InMemoryTable'

/**
 * Create tables (node and edge) from CX2 format
 *
 * @param id - Network ID
 * @param cx - CX2 data object
 * @returns Tuple of [nodeTable, edgeTable]
 */
export const createTablesFromCx = (id: IdType, cx: Cx2): [Table, Table] => {
  const nodeTable = createTable(`${id}-nodes`)
  const edgeTable = createTable(`${id}-edges`)

  const nodes = cxUtil.getNodes(cx)
  const edges = cxUtil.getEdges(cx)

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

  const nodeAttrDefs = attrDefs.nodes
  if (nodeAttrDefs !== undefined) {
    Object.entries(nodeAttrDefs).forEach(([attrName, attrDef]) => {
      const columnDef: Column = {
        type: attrDef.d as ValueTypeName,
        name: attrName,
      }

      if (attrDef.a != null) {
        nodeAttributeTranslationMap[attrDef.a] = attrName
      }

      nodeTable.columns.push(columnDef)
    })
  }

  nodeTable.columns.sort((a, b) => a.name.localeCompare(b.name))

  const edgeAttrDefs = attrDefs.edges
  if (edgeAttrDefs !== undefined) {
    Object.entries(edgeAttrDefs).forEach(([attrName, attrDef]) => {
      const columnDef = {
        type: attrDef.d as ValueTypeName,
        name: attrName,
      }

      if (attrDef.a != null) {
        edgeAttributeTranslationMap[attrDef.a] = attrName
      }

      edgeTable.columns.push(columnDef)
    })
  }

  edgeTable.columns.sort((a, b) => a.name.localeCompare(b.name))

  nodeAttr.forEach((attr, nodeId) => {
    const processedAttributes: Record<AttributeName, ValueType> = {}

    Object.entries(nodeAttrDefs).forEach(([key, value]) => {
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

  // some nodes may not have a corresponding entry in the nodeAttr map
  // initialize them in the table with an empty row
  nodes.forEach((n) => {
    if (!nodeTable.rows.has(`${n.id}`)) {
      nodeTable.rows.set(`${n.id}`, {})
    }
  })

  edgeAttr.forEach((attr, edgeId) => {
    const processedAttributes: Record<string, ValueType> = {}
    const translatedEdgeId = translateCXEdgeId(edgeId)

    Object.entries(edgeAttrDefs).forEach(([key, value]) => {
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

  // some edges may not have a corresponding entry in the edgeAttr map
  // initialize them in the table with an empty row
  edges.forEach((e) => {
    const translatedEdgeId = translateCXEdgeId(`${e.id}`)
    if (!edgeTable.rows.has(translatedEdgeId)) {
      edgeTable.rows.set(translatedEdgeId, {})
    }
  })

  return [nodeTable, edgeTable]
}
