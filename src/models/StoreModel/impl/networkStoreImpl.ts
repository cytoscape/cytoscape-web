import { CollectionReturnValue } from 'cytoscape'

import { IdType } from '../../IdType'
import { Edge, Network } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import {
  NetworkUpdatedEvent,
  UpdateEventType,
} from '../NetworkStoreModel'

export interface NetworkStoreState {
  networks: Map<IdType, Network>
  lastUpdated?: NetworkUpdatedEvent
}

/**
 * Set a network in the store
 */
export const setNetwork = (
  state: NetworkStoreState,
  networkId: IdType,
  network: Network,
): NetworkStoreState => {
  const newNetworks = new Map(state.networks)
  newNetworks.set(networkId, network)
  return {
    ...state,
    networks: newNetworks,
  }
}

/**
 * Add a network to the store
 */
export const add = (
  state: NetworkStoreState,
  network: Network,
): NetworkStoreState => {
  const newNetworks = new Map(state.networks)
  newNetworks.set(network.id, network)
  return {
    ...state,
    networks: newNetworks,
  }
}

/**
 * Delete a network from the store
 */
export const deleteNetwork = (
  state: NetworkStoreState,
  networkId: IdType,
): NetworkStoreState => {
  const newNetworks = new Map(state.networks)
  newNetworks.delete(networkId)
  return {
    ...state,
    networks: newNetworks,
  }
}

/**
 * Delete all networks from the store
 */
export const deleteAll = (state: NetworkStoreState): NetworkStoreState => {
  return {
    ...state,
    networks: new Map<IdType, Network>(),
  }
}

/**
 * Extract edge information from deleted elements
 */
export const extractDeletedEdges = (
  deletedElements: CollectionReturnValue,
): Edge[] => {
  const deletedEdges = deletedElements.edges()
  return deletedEdges.map((edge) => {
    const sourceNode: IdType = edge.source().id()
    const targetNode: IdType = edge.target().id()
    return {
      id: edge.id(),
      s: sourceNode,
      t: targetNode,
    }
  })
}

/**
 * Create a network updated event for deleted nodes
 */
export const createDeleteNodesEvent = (
  networkId: IdType,
  deletedElements: CollectionReturnValue,
): NetworkUpdatedEvent => {
  const deletedNodes = deletedElements.nodes()
  const deletedEdges = deletedElements.edges()
  const deletedNodeIds = deletedNodes.map((node) => node.id())
  const deletedEdgeIds = deletedEdges.map((edge) => edge.id())
  const deleted: string[] = [...deletedNodeIds, ...deletedEdgeIds]

  return {
    networkId,
    type: UpdateEventType.DELETE,
    payload: deleted,
  }
}

/**
 * Create a network updated event for deleted edges
 */
export const createDeleteEdgesEvent = (
  networkId: IdType,
  deletedElements: CollectionReturnValue,
): NetworkUpdatedEvent => {
  const deletedEdges = deletedElements.edges()
  const deletedEdgeIds = deletedEdges.map((edge) => edge.id())

  return {
    networkId,
    type: UpdateEventType.DELETE,
    payload: deletedEdgeIds,
  }
}

/**
 * Add node to a network and return the updated network
 */
export const addNodeToNetwork = (
  network: Network,
  nodeId: IdType,
): Network => {
  return NetworkFn.addNode(network, nodeId)
}

/**
 * Add nodes to a network and return the updated network
 */
export const addNodesToNetwork = (
  network: Network,
  nodeIds: IdType[],
): Network => {
  return NetworkFn.addNodes(network, nodeIds)
}

/**
 * Add nodes and edges to a network and return the updated network
 */
export const addNodesAndEdgesToNetwork = (
  network: Network,
  nodeIds: IdType[],
  edges: Edge[],
): Network => {
  let updated = NetworkFn.addNodes(network, nodeIds)
  updated = NetworkFn.addEdges(updated, edges)
  return updated
}

/**
 * Delete nodes from a network and return deleted elements and updated network
 */
export const deleteNodesFromNetwork = (
  network: Network,
  nodeIds: IdType[],
): { deletedElements: CollectionReturnValue; updatedNetwork: Network } => {
  const deletedElements = NetworkFn.deleteNodes(network, nodeIds)
  // Note: NetworkFn.deleteNodes mutates the network, so we return the same reference
  return {
    deletedElements,
    updatedNetwork: network,
  }
}

/**
 * Delete edges from a network and return deleted elements and updated network
 */
export const deleteEdgesFromNetwork = (
  network: Network,
  edgeIds: IdType[],
): { deletedElements: CollectionReturnValue; updatedNetwork: Network } => {
  const deletedElements = NetworkFn.deleteEdges(network, edgeIds)
  // Note: NetworkFn.deleteEdges mutates the network, so we return the same reference
  return {
    deletedElements,
    updatedNetwork: network,
  }
}

/**
 * Add edge to a network and return the updated network
 */
export const addEdgeToNetwork = (
  network: Network,
  id: IdType,
  s: IdType,
  t: IdType,
): Network => {
  return NetworkFn.addEdge(network, { id, s, t })
}

/**
 * Add edges to a network and return the updated network
 */
export const addEdgesToNetwork = (
  network: Network,
  edges: Edge[],
): Network => {
  return NetworkFn.addEdges(network, edges)
}

