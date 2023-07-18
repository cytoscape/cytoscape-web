import { IdType } from '../../IdType'
import { AttributeName, ValueType } from '../../TableModel'
import { Network, Node, Edge } from '..'

import { Cx2 } from '../../CxModel/Cx2'

import { Node as CxNode } from '../../CxModel/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../CxModel/Cx2/CoreAspects/Edge'
import * as cxUtil from '../../CxModel/cx2-util'

import { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import * as cytoscape from 'cytoscape'

const GroupType = { Nodes: 'nodes', Edges: 'edges' } as const
type GroupType = (typeof GroupType)[keyof typeof GroupType]

/**
 * Private class implementing graph object using
 * Cytoscape.js
 *
 * Simply stores graph structure only, no attributes
 *
 */
class CyNetwork implements Network {
  readonly id: IdType

  // Graph storage, using Cytoscape
  // Only topology is stored here, attributes are stored in the table
  private readonly _store: Core

  constructor(id: IdType) {
    this.id = id
    this._store = createCyDataStore()
  }

  get nodes(): Node[] {
    return this._store.nodes().map((node: NodeSingular) => ({
      id: node.id(),
    }))
  }

  get edges(): Edge[] {
    return this._store.edges().map((edge: EdgeSingular) => ({
      id: edge.id(),
      s: edge.source().id(),
      t: edge.target().id(),
    }))
  }

  get store(): Core {
    return this._store
  }
}

/**
 *
 * @returns Initialized Cytoscape.js Core object
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

export const isEdgeId = (id: IdType): boolean => id.startsWith('e')

export const translateEdgeIdToCX = (id: IdType): IdType => id.slice(1)

/**
 * Create a network from a CX object
 *
 * @param cx
 * @param id
 * @returns
 *
 */
export const createNetworkFromCx = (id: IdType, cx: Cx2): Network => {
  // Create an empty CyNetwork
  const cyNet: CyNetwork = new CyNetwork(id)

  // Extract nodes and edges from CX2 object
  const cxNodes: CxNode[] = cxUtil.getNodes(cx)
  const cxEdges: CxEdge[] = cxUtil.getEdges(cx)

  // Convert CX nodes to Cytoscape nodes
  cyNet.store.add(
    cxNodes.map((node: CxNode) => {
      const n: any = node
      return createCyNode(
        node.id !== undefined ? node.id.toString() : n['@id'].toString(),
      )
    }),
  )

  // Convert CX edges to Cytoscape edges
  cyNet.store.add(
    cxEdges.map((edge: CxEdge, i: number) => {
      const eBlob: any = edge
      const e = createCyEdge(
        translateCXEdgeId(
          edge.id !== undefined ? edge.id.toString() : eBlob['@id'].toString(),
        ),
        edge.s.toString(),
        edge.t.toString(),
      )
      return e
    }),
  )

  return cyNet
}

/**
 * Create a Cytoscape.js object from a Cyjs JSON
 *
 * @param id
 * @param cyJson
 * @returns
 */
export const createFromCyJson = (id: IdType, cyJson: object): Network => {
  const cyNet: CyNetwork = new CyNetwork(id)
  cyNet.store.json(cyJson)

  return cyNet
}

const addToCyStoreFromLists = (network: Network, cyNet: CyNetwork): void => {
  cyNet.store.add(
    network.nodes.map((node: Node) => createCyNode(node.id.toString())),
  )

  cyNet.store.add(
    network.edges.map((edge: Edge) =>
      createCyEdge(edge.id.toString(), edge.s.toString(), edge.t.toString()),
    ),
  )
}

export const plainNetwork2CyNetwork = (network: Network): Network => {
  const { id } = network
  const cyNet: CyNetwork = new CyNetwork(id)
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

export const deleteNodes = (
  network: Network,
  nodeIds: IdType[],
): cytoscape.CollectionReturnValue => {
  const cyNet: CyNetwork = network as CyNetwork
  const removed = cyNet.store.remove(
    nodeIds.map((nodeId) => `#${nodeId}`).join(', '),
  )
  return removed
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

export const deleteEdges = (
  network: Network,
  edgeIds: IdType[],
): cytoscape.CollectionReturnValue => {
  const cyNet: CyNetwork = network as CyNetwork
  return cyNet.store.remove(edgeIds.map((edgeId) => `#${edgeId}`).join(', '))
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
  // const nodeTable = cyGraph.nodeTable
  const store = cyGraph.store

  if (!Array.isArray(nodes)) {
    // Add single node
    const nodeId = (nodes[0] as Node).id
    store.add(createCyNode(nodeId))

    // const row: Record<AttributeName, ValueType> = nodes[1]
    // TableFn.insertRow(nodeTable, [nodeId, row])
  }

  return network
}
