import { IdType } from '../IdType'
import { Network, Edge } from '../NetworkModel'

export const UpdateEventType = {
  ADD: 'ADD',
  DELETE: 'DELETE',
} as const

export type UpdateEventType =
  (typeof UpdateEventType)[keyof typeof UpdateEventType]

export interface NetworkUpdatedEvent {
  networkId: IdType // Last modified network ID
  type: UpdateEventType // Type of modification, add or delete
  payload: IdType[] // List of node/edge IDs updated
}

export interface NetworkState {
  networks: Map<IdType, Network>
  // Wil be set by this store when a network topology is updated
  lastUpdated?: NetworkUpdatedEvent
}

/**
 * Actions to mutate (update) network topology
 */
export interface NetworkUpdateActions {
  // Add node(s) to a network
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void

  addNodesAndEdges: (networkId: IdType, nodes: IdType[], edges: Edge[]) => void

  // Add edge(s) to a network
  addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
  addEdges: (networkId: IdType, edges: Edge[]) => void

  // Delete nodes and edges from a network

  /**
   * Delete nodes and all edges connected to them
   *
   * @param networkId ID of the network to delete nodes from
   * @param nodeIds List of node IDs to be deleted
   * @returns List of deleted Edge objects connected to the deleted nodes. (Node IDs are not returned.)
   *
   * @description This function will delete the nodes and all edges connected to them.
   *
   */
  deleteNodes: (networkId: IdType, nodeIds: IdType[]) => Edge[]
  deleteEdges: (networkId: IdType, edgeIds: IdType[]) => void
}

/**
 * Actions to add/delete networks from the store
 */
export interface NetworkActions {
  // Add a new network
  add: (network: Network) => void

  // Delete a network
  delete: (networkId: IdType) => void

  setNetwork: (networkId: IdType, network: Network) => void

  // Delete all networks from the store
  deleteAll: () => void
}

export type NetworkStore = NetworkState & NetworkActions & NetworkUpdateActions
