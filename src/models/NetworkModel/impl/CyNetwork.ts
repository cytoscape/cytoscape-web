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
    this._nodeTable = nodeTable ?? TableFn.createTable(id)
    this._edgeTable = edgeTable ?? TableFn.createTable(id)
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

  get nodes(): Node[] {
    return this._store.nodes().map((node) => ({
      id: node.id(),
    }))
  }

  get edges(): Edge[] {
    return this._store.edges().map((edge) => ({
      id: edge.id(),
      s: edge.source().id(),
      t: edge.target().id(),
    }))
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
    styleEnabled: false,
  })

/**
 *
 * @param id Create an empty network
 * @returns Network instance
 */
export const createNetwork = (id: IdType): Network => new CyNetwork(id)

// cy.js does not allow nodes and edges to have the same ids
// when converting cx ids to cy ids, we add a prefix to edges
export const translateCXEdgeId = (id: IdType): IdType => `e${id}`

/**
 * Create a network from a CX object
 *
 * @param cx
 * @param id
 * @returns
 *
 */
export const createNetworkFromCx = (id: IdType, cx: Cx2): Network => {
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
    cxEdges.map((edge: CxEdge, i: number) => {
      const e = createCyEdge(
        translateCXEdgeId(edge.id.toString()),
        edge.s.toString(),
        edge.t.toString(),
      )
      return e
    }),
  )

  return cyNet
}


export const createFromCyJson = (id: IdType, cyJson: object): Network => {
  const nodeTable = TableFn.createTable(id)
  const edgeTable = TableFn.createTable(id)
  const cyNet: CyNetwork = new CyNetwork(id, nodeTable, edgeTable)
  cyNet.store.json(cyJson)
  return cyNet
}

const addToCyStoreFromLists = (network:Network, cyNet: CyNetwork):void => {
  cyNet.store.add(
    network.nodes.map((node: Node) => createCyNode(node.id.toString())),
  )

  cyNet.store.add(
    network.edges.map((edge: Edge) => createCyEdge(
        edge.id.toString(),
        edge.s.toString(),
        edge.t.toString(),
      )
    )
  )
}

export const plainNetwork2CyNetwork = (network: Network): Network => {
  const { id } = network
  const nodeTable = TableFn.createTable(id)
  const edgeTable = TableFn.createTable(id)
  const cyNet: CyNetwork = new CyNetwork(id, nodeTable, edgeTable)
  addToCyStoreFromLists(network, cyNet)
  return cyNet
}

export const createNetworkFromLists = (
  id: IdType,
  nodes: Node[],
  edges: Edge[],
): Network => {
  const cyNet: Network = new CyNetwork(id)
  addNodes(
    cyNet,
    nodes.map((node) => node.id),
  )
  addEdges(cyNet, edges)
  return cyNet
}

export const createCyJSON = (network: Network): object => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  return store.json()
}

export const nodes = (network: Network): Node[] => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  return store.nodes().map((node) => ({
    id: node.id(),
  }))
}

export const edges = (network: Network): Edge[] => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  return store.edges().map((edge) => ({
    id: edge.id(),
    s: edge.source().id(),
    t: edge.target().id(),
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
  // TODO: Implement
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

interface CyNode {
  group: GroupType
  data: {
    id: IdType
  }
}

interface CyEdge {
  group: GroupType
  data: {
    id: IdType
    source: IdType
    target: IdType
  }
}

const createCyNode = (nodeId: IdType): CyNode => {
  return {
    group: GroupType.Nodes,
    data: { id: nodeId },
  }
}

const createCyEdge = (id: IdType, source: IdType, target: IdType): CyEdge => ({
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
  return cyNet
}

export const deleteNode = (network: Network, nodeId: IdType): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.remove(nodeId)
  return cyNet
}

export const addNodes = (network: Network, nodeIds: IdType[]): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.add(nodeIds.map((nodeId) => createCyNode(nodeId)))
  return network
}

export const addEdge = (network: Network, edge: Edge): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.add(createCyEdge(edge.id, edge.s, edge.t))
  return network
}

export const addEdges = (network: Network, edges: Edge[]): Network => {
  const cyNet: CyNetwork = network as CyNetwork
  cyNet.store.add(edges.map((edge) => createCyEdge(edge.id, edge.s, edge.t)))
  return network
}

export const addNodeRow = (
  network: Network,
  newNodeId: IdType,
  row?: Record<AttributeName, ValueType>,
): Network => {
  const cyGraph = network as CyNetwork
  const store = cyGraph.store
  const node = createCyNode(newNodeId)
  store.add(node)
  return network
}

export const addNodesWithRows = (
  network: Network,
  nodes:
    | [Node, Record<AttributeName, ValueType>?]
    | Array<[Node, Record<AttributeName, ValueType>?]>,
): Network => {
  const cyGraph = network as CyNetwork
  const nodeTable = cyGraph.nodeTable
  const store = cyGraph.store

  if (!Array.isArray(nodes)) {
    // Add single node
    const nodeId = (nodes[0] as Node).id
    store.add(createCyNode(nodeId))

    const row: Record<AttributeName, ValueType> = nodes[1]
    TableFn.insertRow(nodeTable, [nodeId, row])
  }

  return network
}
