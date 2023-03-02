import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { deleteNetworkFromDb } from './persist/db'

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

export const useNetworkStore = create(
  immer<NetworkState & NetworkActions & UpdateActions>((set) => ({
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
        const newNetworkMap = new Map(state.networks)
        newNetworkMap.delete(networkId)
        void deleteNetworkFromDb(networkId).then(() => {
          console.log('Network from db', networkId)
        })
        return {
          networks: newNetworkMap,
        }
      }),
    deleteAll: () => set({ networks: new Map<IdType, Network>() }),
  })),
)
