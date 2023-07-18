import { IdType } from '../models/IdType'
import NetworkFn, { Edge, Network } from '../models/NetworkModel'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'

export const UpdateEventType = {
  ADD: 'ADD',
  DELETE: 'DELETE',
} as const

type UpdateEventType = (typeof UpdateEventType)[keyof typeof UpdateEventType]

export interface NetworkUpdatedEvent {
  networkId: IdType // Last modified network ID
  type: UpdateEventType // Type of modification, add or delete
  payload: IdType[] // List of node/edge IDs updated
}

interface NetworkState {
  networks: Map<IdType, Network>
  // Wil be set by this store when a network topology is updated
  lastUpdated?: NetworkUpdatedEvent
}

/**
 * Actions to mutate (update) network topology
 */
interface UpdateActions {
  // Add node(s) to a network
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void

  // Add edge(s) to a network
  addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
  addEdges: (networkId: IdType, edges: Edge[]) => void

  // Delete nodes and edges from a network
  deleteNodes: (networkId: IdType, nodeIds: IdType[]) => void
  deleteEdges: (networkId: IdType, edgeIds: IdType[]) => void
}

/**
 * Actions to add/delete networks from the store
 */
interface NetworkActions {
  // Add a new network
  add: (network: Network) => void

  // Delete a network
  delete: (networkId: IdType) => void

  // Delete all networks from the store
  deleteAll: () => void
}

type NetworkStore = NetworkState & NetworkActions & UpdateActions

const persist =
  (config: StateCreator<NetworkStore>) =>
  (
    set: StoreApi<NetworkStore>['setState'],
    get: StoreApi<NetworkStore>['getState'],
    api: StoreApi<NetworkStore>,
  ) =>
    config(
      async (args) => {
        const currentNetworkId: IdType =
          useWorkspaceStore.getState().workspace.currentNetworkId
        set(args)
        const updated = get().networks.get(currentNetworkId)
        const deleted = updated === undefined
        if (!deleted) {
          console.log('DB Update: network store', updated)
          await putNetworkToDb(updated)
        }
      },
      get,
      api,
    )

export const useNetworkStore = create(
  subscribeWithSelector(
    immer<NetworkStore>(
      persist((set, get) => ({
        networks: new Map<IdType, Network>(),
        lastModified: undefined,

        addNode: (networkId: IdType, nodeId: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              NetworkFn.addNode(network, nodeId)
            }
            return state
          })
        },
        addNodes: (networkId: IdType, nodeIds: IdType[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              NetworkFn.addNodes(network, nodeIds)
            }
            return {
              networks: { ...state.networks },
            }
          })
        },

        deleteNodes: (networkId: IdType, nodeIds: IdType[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const deletedElements = NetworkFn.deleteNodes(network, nodeIds)
              const deletedNodes = deletedElements.nodes()
              const deletedEdges = deletedElements.edges()
              const deletedNodeIds = deletedNodes.map((node) => node.id())
              const deletedEdgeIds = deletedEdges.map((edge) => edge.id())
              const deleted = [...deletedNodeIds, ...deletedEdgeIds]
              const event: NetworkUpdatedEvent = {
                networkId,
                type: UpdateEventType.DELETE,
                payload: deleted,
              }
              state.lastUpdated = event
            }
            return state
          })
        },
        deleteEdges: (networkId: IdType, edgeIds: IdType[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              NetworkFn.deleteEdges(network, edgeIds)
            }
            return state
          })
        },

        addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              NetworkFn.addEdge(network, { id, s, t })
            }
            return {
              networks: { ...state.networks },
            }
          })
        },
        addEdges: (networkId: IdType, edges: Edge[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              NetworkFn.addEdges(network, edges)
            }
            return {
              networks: { ...state.networks },
            }
          })
        },

        add: (network: Network) =>
          set((state) => {
            const newNetworkMap = new Map(state.networks).set(
              network.id,
              network,
            )
            state.networks = newNetworkMap
            return state
          }),
        delete: (networkId: IdType) =>
          set((state) => {
            state.networks.delete(networkId)
            void deleteNetworkFromDb(networkId).then(() => {
              console.log('## Deleted network from db', networkId)
            })
            return state
          }),
        deleteAll: () =>
          set((state) => {
            clearNetworksFromDb()
              .then(() => {
                console.log(
                  '---------------------------@@@@Deleted all networks from db',
                )
              })
              .catch((err) => {
                console.log('Error clearing all networks from db', err)
              })

            return { ...state, networks: new Map<IdType, Network>() }
          }),
      })),
    ),
  ),
)
