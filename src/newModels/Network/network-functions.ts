import { Network } from '.'
import { IdType } from '../IdType'

// @ts-ignore
import * as cytoscape from 'cytoscape'
import { Node } from './Node'
import { Edge } from './Edge'
import { GraphStore } from './GraphStore'
import { Core } from 'cytoscape'
import { Cx2 } from '../../utils/cx/Cx2'
import { Node as CxNode } from '../../utils/cx/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../utils/cx/Cx2/CoreAspects/Edge'

import * as cxUtil from '../../utils/cx/cx2-util'
import { Table } from '../Table'
import { createTable } from '../Table/table-functions'

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
  const network: Network = createNetwork(id || 'network')
  const table: Table = createTable(id || 'table')

  cxNodes.forEach((node: CxNode) => {
    const newNode: Node = {
      id: node.id.toString(),
    }
    addNode(network, newNode)
  })

  cxEdges.forEach((edge: CxEdge) => {
    const newEdge: Edge = {
      id: edge.id.toString() as IdType,
      s: edge.s.toString() as IdType,
      t: edge.t.toString() as IdType,
    } as Edge
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
    id: edge.id as IdType,
    source: edge.s as IdType,
    target: edge.t as IdType,
  }
}

export const nodes = (network: Network): Node[] => {
  const cyNetwork = network as Network & GraphStore<any>

  return cyNetwork.store
    .nodes()
    .map((node: any) => ({ id: node.data('id') } as Node))
}

export const edges = (network: Network): Edge[] => {
  const cyNetwork = network as Network & GraphStore<any>

  return cyNetwork.store.edges().map(
    (edge: any) =>
      ({
        id: edge.data('id'),
        s: edge.data('source'),
        t: edge.data('target'),
      } as Edge),
  )
}
