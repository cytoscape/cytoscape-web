import { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import cytoscape from 'cytoscape'

import { IdType } from '../../IdType'
import { AttributeName, ValueType } from '../../TableModel'
import { Edge,Network, Node } from '..'

const GroupType = { Nodes: 'nodes', Edges: 'edges' } as const
type GroupType = (typeof GroupType)[keyof typeof GroupType]

/**
 * Private class implementing graph object using
 * Cytoscape.js
 *
 * Simply stores graph structure only, no attributes
 *
 */
class NetworkImpl implements Network {
  readonly id: IdType

  // Graph storage, using Cytoscape
  // Only topology is stored here, attributes are stored in the table
  private readonly _store: Core

  constructor(id: IdType) {
    this.id = id
    this._store = cytoscape({
      headless: true,
      styleEnabled: false,
    })
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
 * @param id Create an empty network
 * @returns Network instance
 */
export const createNetwork = (id: IdType): Network => new NetworkImpl(id)

// cy.js does not allow nodes and edges to have the same ids
// when converting cx ids to cy ids, we add a prefix to edges
export const translateCXEdgeId = (id: IdType): IdType => `e${id}`

export const isEdgeId = (id: IdType): boolean => id.startsWith('e')

export const translateEdgeIdToCX = (id: IdType): IdType => id.slice(1)

/**
 * Create a Cytoscape.js object from a Cyjs JSON
 *
 * @param id
 * @param cyJson
 * @returns
 */
export const createFromCyJson = (
  id: IdType,
  cyJson: { elements: any },
): Network => {
  const networkImpl: NetworkImpl = new NetworkImpl(id)
  networkImpl.store.json(cyJson)

  return networkImpl
}

const addToCyStoreFromLists = (
  network: Network,
  networkImpl: NetworkImpl,
): void => {
  networkImpl.store.add(
    network.nodes.map((node: Node) => createCyNode(node.id.toString())),
  )

  networkImpl.store.add(
    network.edges.map((edge: Edge) =>
      createCyEdge(edge.id.toString(), edge.s.toString(), edge.t.toString()),
    ),
  )
}

export const networkModelToImplNetwork = (network: Network): Network => {
  const { id } = network
  const networkImpl: NetworkImpl = new NetworkImpl(id)
  addToCyStoreFromLists(network, networkImpl)
  return networkImpl
}

export const createNetworkFromLists = (
  id: IdType,
  nodes: Node[],
  edges: Edge[],
): Network => {
  const networkImpl: Network = new NetworkImpl(id)
  addNodes(
    networkImpl,
    nodes.map((node) => node.id),
  )
  addEdges(networkImpl, edges)
  return networkImpl
}

export const createCyJSON = (network: Network): object => {
  const networkImpl = network as NetworkImpl
  const store = networkImpl.store
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
  const networkImpl: NetworkImpl = network as NetworkImpl
  networkImpl.store.add(createCyNode(nodeId))
  return networkImpl
}

export const deleteNodes = (
  network: Network,
  nodeIds: IdType[],
): cytoscape.CollectionReturnValue => {
  const networkImpl: NetworkImpl = network as NetworkImpl
  const removed = networkImpl.store.remove(
    nodeIds.map((nodeId) => `#${nodeId}`).join(', '),
  )
  return removed
}

export const addNodes = (network: Network, nodeIds: IdType[]): Network => {
  const networkImpl: NetworkImpl = network as NetworkImpl
  networkImpl.store.add(nodeIds.map((nodeId) => createCyNode(nodeId)))
  return network
}

export const addEdge = (network: Network, edge: Edge): Network => {
  const networkImpl: NetworkImpl = network as NetworkImpl
  networkImpl.store.add(createCyEdge(edge.id, edge.s, edge.t))
  return network
}

export const addEdges = (network: Network, edges: Edge[]): Network => {
  const networkImpl: NetworkImpl = network as NetworkImpl
  networkImpl.store.add(
    edges.map((edge) => createCyEdge(edge.id, edge.s, edge.t)),
  )
  return network
}

export const deleteEdges = (
  network: Network,
  edgeIds: IdType[],
): cytoscape.CollectionReturnValue => {
  const networkImpl: NetworkImpl = network as NetworkImpl
  return networkImpl.store.remove(
    edgeIds.map((edgeId) => `#${edgeId}`).join(', '),
  )
}

export const addNodeRow = (
  network: Network,
  newNodeId: IdType,
  row?: Record<AttributeName, ValueType>,
): Network => {
  const networkImpl = network as NetworkImpl
  const store = networkImpl.store
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
  const networkImpl = network as NetworkImpl
  // const nodeTable = networkImpl.nodeTable
  const store = networkImpl.store

  if (!Array.isArray(nodes)) {
    // Add single node
    const nodeId = (nodes[0] as Node).id
    store.add(createCyNode(nodeId))

    // const row: Record<AttributeName, ValueType> = nodes[1]
    // TableFn.insertRow(nodeTable, [nodeId, row])
  }

  return network
}

/**
 * An utility function to get the internal graph implementation
 *
 * In most cases, we can handle networks as a simple collection, but
 * in case we need to use graph-specific methods, we can use this function
 * to access the real graph object
 *
 * @param network
 * @returns Cytoscape instance (for this impl)
 */
export const getInternalNetworkDataStore = (network: Network): any => {
  const networkImpl = network as NetworkImpl
  return networkImpl.store
}

/**
 * Move an edge to new source/target endpoints, preserving the edge ID.
 *
 * @param network The network containing the edge
 * @param edgeId The ID of the edge to move
 * @param newSourceId The new source node ID
 * @param newTargetId The new target node ID
 * @returns The old source and target IDs before the move
 */
export const moveEdge = (
  network: Network,
  edgeId: IdType,
  newSourceId: IdType,
  newTargetId: IdType,
): { oldSourceId: IdType; oldTargetId: IdType } => {
  const networkImpl = network as NetworkImpl
  const store = networkImpl.store
  const edge = store.$id(edgeId)

  if (edge.empty()) {
    throw new Error(`Edge ${edgeId} not found in network ${network.id}`)
  }

  const oldSourceId = edge.source().id()
  const oldTargetId = edge.target().id()

  if (store.$id(newSourceId).empty()) {
    throw new Error(
      `Source node ${newSourceId} not found in network ${network.id}`,
    )
  }
  if (store.$id(newTargetId).empty()) {
    throw new Error(
      `Target node ${newTargetId} not found in network ${network.id}`,
    )
  }

  // Cytoscape.js edge.move() atomically updates source/target, preserving edge ID
  edge.move({ source: newSourceId, target: newTargetId })

  return { oldSourceId, oldTargetId }
}
