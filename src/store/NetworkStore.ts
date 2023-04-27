import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'
/**
 * Network State manager based on zustand
 */
interface NetworkState {
  networks: Map<IdType, Network>
}

/**
 * Actions to mutate network structure
 */
interface UpdateActions {
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void
  deleteNode: (networkId: IdType, nodeId: IdType) => void
  addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
}

interface NetworkActions {
  add: (network: Network) => void
  delete: (networkId: IdType) => void
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
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId
        console.log('persist middleware updating network store')
        set(args)
        const updated = get().networks.get(currentNetworkId)
        console.log('new network store:', updated)
        const deleted = updated === undefined
        if (!deleted) {
          await putNetworkToDb(updated).then(() => {})
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

      deleteNode: (networkId: IdType, nodeId: IdType) => {
        set((state) => {
          const network = state.networks.get(networkId)
          if (network !== undefined) {
            NetworkFn.deleteNode(network, nodeId)
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
              console.log('Deleted all networks from db')
            })
            .catch((err) => {
              console.log('Error clearing all networks from db', err)
            })

          return { ...state, networks: new Map<IdType, Network>() }
        }),
    })),
  ),
)
