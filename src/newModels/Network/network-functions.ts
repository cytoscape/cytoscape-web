import { Network } from '.'
import { IdType } from '../IdType'

import * as cytoscape from 'cytoscape'
import { Node } from './Node'
import { Edge } from './Edge'
import { GraphStore } from './GraphStore'
import { Core } from 'cytoscape'

import { Table } from '../Table'
import { Column } from '../Table/Column'
import { Row } from '../Table/Row'
import { RowData } from '../Table/RowData'

import { addColumn, addRow, createTable } from '../Table/table-functions'

import * as cxUtil from '../../utils/cx/cx2-util'
import { AttributeDeclarations } from '../../utils/cx/Cx2/CoreAspects/AttributeDeclarations'
import { AttributeValue } from '../../utils/cx/Cx2/CoreAspects/AttributeValue'
import { Cx2 } from '../../utils/cx/Cx2'
import { Node as CxNode } from '../../utils/cx/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../utils/cx/Cx2/CoreAspects/Edge'
import { Attribute } from '../../utils/cx/Cx2/CoreAspects/Attribute'

const GroupType = { Nodes: 'nodes', Edges: 'edges' } as const
type GroupType = typeof GroupType[keyof typeof GroupType]

const createCyDataStore = (): Core =>
  cytoscape({
    headless: true,
  })

export const createNetwork = (id: IdType): Network => {
  const network: Network & GraphStore<Core> = {
    id,
    store: createCyDataStore(),
  }
  return network
}

export const createNetworkFromCx = (cx: Cx2, id?: IdType): [Network, Table] => {
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)
  const network: Network = createNetwork(id ?? 'network')
  const table: Table = createTable(id ?? 'table')

  // get all attributes and create columns
  const attributeDeclarations: AttributeDeclarations =
    cxUtil.getAttributeDeclarations(cx)

  const nodeColumns: Column[] = Object.keys(
    attributeDeclarations.attributeDeclarations[0].nodes,
  )
    .filter((key: string) => !key.startsWith('__'))
    .map((key: string) => {
      const attribute: AttributeValue =
        attributeDeclarations.attributeDeclarations[0].nodes[key]

      return {
        id: attribute.a ?? key,
        name: attribute.a ?? key,
        type: attribute.d,
      }
    })
  addColumn(table, nodeColumns)

  const nodeRows: Row[] = []

  cxNodes.forEach((node: CxNode) => {
    const newNode: Node = {
      id: node.id.toString(),
    }

    // extract node attributes and create row
    const nodeAttrs: Attribute | undefined = node.v
    const rowData: RowData = {}
    if (nodeAttrs != null) {
      nodeColumns.forEach((column: Column) => {
        rowData[column.id] = nodeAttrs[column.id]
      })
    }
    nodeRows.push({ key: `${node.id}`, data: rowData })
    addNode(network, newNode)
  })
  addRow(table, nodeRows)

  cxEdges.forEach((edge: CxEdge) => {
    const newEdge: Edge = {
      id: edge.id.toString(),
      s: edge.s.toString(),
      t: edge.t.toString(),
    }
    addEdge(network, newEdge)
  })

  return [network, table]
}

export const addNode = (network: Network, node: Node): Network => {
  const graphImpl = network as Network & GraphStore<any>
  graphImpl.store.add({
    group: GroupType.Nodes,
    data: { id: node.id },
  })
  return network
}

export const addNodes = (network: Network, nodes: Node[]): Network => {
  const graphImpl = network as Network & GraphStore<Core>

  graphImpl.store.add(
    nodes.map((node) => ({
      group: GroupType.Nodes,
      data: { id: node.id },
    })),
  )
  return network
}

export const addEdge = (network: Network, edge: Edge): Network => {
  const graphImpl = network as Network & GraphStore<Core>
  graphImpl.store.add({
    group: GroupType.Edges,
    data: toEdgeData(edge),
  })

  return network
}
const toEdgeData = (edge: Edge): any => {
  return {
    id: edge.id,
    source: edge.s,
    target: edge.t,
  }
}

export const nodes = (network: Network): Node[] => {
  const cyNetwork = network as Network & GraphStore<any>

  return cyNetwork.store.nodes().map((node: any) => ({ id: node.data('id') }))
}

export const edges = (network: Network): Edge[] => {
  const cyNetwork = network as Network & GraphStore<any>

  return cyNetwork.store.edges().map((edge: any) => ({
    id: edge.data('id'),
    s: edge.data('source'),
    t: edge.data('target'),
  }))
}
