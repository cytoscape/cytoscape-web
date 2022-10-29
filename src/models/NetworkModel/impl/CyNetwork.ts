import { IdType } from '../../IdType'
import TableFn, { AttributeName, Table, ValueType } from '../../TableModel'
import { Network, Node, Edge, NetworkAttributes } from '..'

import { Cx2 } from '../../../utils/cx/Cx2'

import { Node as CxNode } from '../../../utils/cx/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../../utils/cx/Cx2/CoreAspects/Edge'
import * as cxUtil from '../../../utils/cx/cx2-util'

import { Core } from 'cytoscape'
import * as cytoscape from 'cytoscape'
import { createTablesFromCx } from '../../TableModel/impl/InMemoryTable'

const GroupType = { Nodes: 'nodes', Edges: 'edges' } as const
type GroupType = typeof GroupType[keyof typeof GroupType]

/**
 * Private class implementing graph object using
 * Cytoscape.js
 */
class CyNetwork implements Network {
  readonly id: IdType

  // Data Tables
  private readonly _nodeTable: Table
  private readonly _edgeTable: Table

  // Network properties as a Record
  private readonly _netAttributes: NetworkAttributes

  constructor(id: IdType, nodeTable?: Table, edgeTable?: Table) {
    this.id = id
    this._store = createCyDataStore()
    this._nodeTable = nodeTable || TableFn.createTable(id)
    this._edgeTable = edgeTable || TableFn.createTable(id)
    this._netAttributes = { id, attributes: {} }
  }

  // Graph storage, using Cytoscape
  // Only topology is stored here, attributes are stored in the table
  private readonly _store: Core

  get nodeTable(): Table {
    return this._nodeTable
  }

  get edgeTable(): Table {
    return this._edgeTable
  }

  get netAttributes(): NetworkAttributes {
    return this._netAttributes
  }

  get store(): Core {
    return this._store
  }
}

/**
 *
 * @returns Initialize Cytoscape
 */
const createCyDataStore = (): Core =>
  cytoscape({
    headless: true,
  })

/**
 *
 * @param id Create an empty network
 * @returns Network instance
 */
export const createNetwork = (id: IdType): Network => new CyNetwork(id)

/**
 * Create a network from a CX object
 *
 * @param cx
 * @param id
 * @returns
 *
 */
export const createNetworkFromCx = (cx: Cx2, id: IdType): Network => {
  const tables: [Table, Table] = createTablesFromCx(id, cx)

  // Create an empty CyNetwork
  const cyNet: CyNetwork = new CyNetwork(id, tables[0], tables[1])

  // Extract nodes and edges from CX2 object
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  // Convert CX nodes to Cytoscape nodes
  cyNet.store.add(
    cxNodes.map((node: CxNode) => createCyNode(node.id.toString())),
  )

  // Convert CX edges to Cytoscape edges
  cyNet.store.add(
    cxEdges.map((edge: CxEdge) =>
      createCyEdge(edge.id.toString(), edge.s.toString(), edge.t.toString()),
    ),
  )

  return cyNet
}

export const nodes = (network: Network): Node[] => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  return store.nodes().map((node) => ({
    id: node.id(),
  }))
}

export const nodeTable = (network: Network): Table => {
  return (network as CyNetwork).nodeTable
}

export const edgeTable = (network: Network): Table => {
  return (network as CyNetwork).edgeTable
}

/**
 * Create a network from Cytopscape.js object
 *
 * @param id Network ID
 * @param cyjs Cytoscape.js object
 *
 * @returns Network instance
 */
export const createNetworkFromCyjs = (id: IdType, cyjs: any): Network => {
  //TODO: Implement
  const network = createNetwork(id)
  return network
}

/**
 * Create a new network object from SIF
 */
export const createFromSif = (
  id: IdType,
  sif: [string, string, string?],
): Network => {
  const network = createNetwork(id)
  return network
}

const createCyNode = (nodeId: IdType) => {
  return {
    group: GroupType.Nodes,
    data: { id: nodeId },
  }
}

const createCyEdge = (id: IdType, source: IdType, target: IdType) => ({
  group: GroupType.Edges,
  data: {
    id,
    source,
    target,
  },
})

/**
 *
 * @param network
 * @param nodeId
 * @returns
 */
export const addNode = (network: Network, nodeId: IdType): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.add(createCyNode(nodeId))
  return network
}

export const addNodes = (network: Network, nodeIds: IdType[]): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.add(nodeIds.map((nodeId) => createCyNode(nodeId)))
  return network
}

export const addEdge = (network: Network, edge: Edge): Network => {
  // TODO: Implement
  return network
}

export const addNodeRow = (
  network: Network,
  newNodeId: IdType,
  row?: Record<AttributeName, ValueType>,
): Network => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  const nodeTable = cyGraph.nodeTable
  const node = createCyNode(newNodeId)
  store.add(node)
  if (row) {
    // TableFn.addRow(nodeTable, row)
  }
  return network
}

export const addNodesWithRows = (
  network: Network,
  nodes:
    | [Node, Record<AttributeName, ValueType>?]
    | [Node, Record<AttributeName, ValueType>?][],
): Network => {
  const cyGraph = network as CyNetwork
  const nodeTable = cyGraph.nodeTable
  const store = cyGraph.store

  if (!Array.isArray(nodes)) {
    // Add single node
    const nodeId = (nodes[0] as Node).id
    store.add(createCyNode(nodeId))

    const row: Record<AttributeName, ValueType> = nodes[1]
    if (row) {
      TableFn.insertRow(nodeTable, [nodeId, row])
    }
  } else {
    // store.add(nodes.map((node: Node) => newNode(node.id)))
  }

  return network
}
