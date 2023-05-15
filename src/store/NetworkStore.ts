import { IdType } from '../models/IdType'
import NetworkFn, { Edge, Network } from '../models/NetworkModel'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'

/**
 * Network data store
 */
interface NetworkState {
  networks: Map<IdType, Network>
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
          console.log('* DB update: network store', updated)
          await putNetworkToDb(updated)
        }
      },
      get,
      api,
    )

export const useNetworkStore = create(
  immer<NetworkStore>(
    persist((set) => ({
      networks: new Map<IdType, Network>(),

      addNode: (networkId: IdType, nodeId: IdType) => {
        set((state) => {
          const network = state.networks.get(networkId)
          if (network !== undefined) {
            NetworkFn.addNode(network, nodeId)
          }
          return {
            networks: { ...state.networks },
          }
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
            NetworkFn.deleteNodes(network, nodeIds)
          }
          return {
            networks: { ...state.networks },
          }
        })
      },
      deleteEdges: (networkId: IdType, edgeIds: IdType[]) => {
        set((state) => {
          const network = state.networks.get(networkId)
          if (network !== undefined) {
            NetworkFn.deleteEdges(network, edgeIds)
          }
          return {
            networks: { ...state.networks },
          }
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
          const newNetworkMap = new Map(state.networks).set(network.id, network)
          return {
            networks: newNetworkMap,
          }
        }),
      delete: (networkId: IdType) =>
        set((state) => {
          state.networks.delete(networkId)
          const newNetworks: Map<IdType, Network> = new Map(state.networks)
          void deleteNetworkFromDb(networkId).then(() => {
            console.log('Deleted network from db', networkId)
          })
          return { ...state, networks: newNetworks }
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
)
