import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, StateStorage } from 'zustand/middleware'
import { db, putNetworkToDb, addTables, getNetworkFromDB } from './persist/db'

/**
 * Network State manager based on zustand
 */
interface NetworkState {
  networks: Record<IdType, Network>
}

/**
 * Actions to mutate network structure
 */
interface UpdateAction {
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void
  deleteNode: (networkId: IdType, nodeId: IdType) => void
  // addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
  // addEdges: (networkId: IdType, edges: Edge[]) => void
}

interface NetworkAction {
  // addFromNdex: (ndexUuid: string) => void
  add: (network: Network) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
}

export const useNetworkStore = create(
  immer<NetworkState & NetworkAction & UpdateAction>((set) => ({
    networks: {},

    addNode: (networkId: IdType, nodeId: IdType) => {
      set((state) => {
        const network = state.networks[networkId]
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
        const network = state.networks[networkId]
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
        const network = state.networks[networkId]
        if (network !== undefined) {
          NetworkFn.deleteNode(network, nodeId)
        }
        return {
          networks: { ...state.networks },
        }
      })
    },

    add: (network) =>
      set((state) => ({
        networks: { ...state.networks, [network.id]: network },
      })),

    delete: (networkId: IdType) => {
      set((state) => {
        delete state.networks.networkId
        return {
          networks: { ...state.networks },
        }
      })
    },
    deleteAll: () => set({ networks: {} }),
  })),
)

// const createSerializableNetwork = (network: Network): object => {
// const cyJs: any = NetworkFn.createCyJSON(network)
// return {
//   id: network.id,
//   elements: cyJs.elements,
//   data: cyJs.data,
// }
// }

// const IDBStorage = {
//   getItem: (name: string): string | null | Promise<string | null> => {
//     console.log('=====>', name)
//     return null
//   },
//   setItem: (name: string, value: string): void | Promise<void> => {
//     console.log('setItem', name, value)
//   },
//   removeItem: (name: string): void | Promise<void> => {},
// }

// {
//   name: 'Net-storage',
//   serialize: (storageVal) => {
//     const { networks } = storageVal.state
//     const serializable = Object.keys(networks).map((key: IdType) =>
//       createSerializableNetwork(networks[key]),
//     )
//     return JSON.stringify(serializable)
//   },
//   deserialize: (str) => {
//     const networks: Record<IdType, Network> = {}
//     const parsedNetworks: any = JSON.parse(str)
//     Object.keys(parsedNetworks).forEach((key) => {
//       const network = NetworkFn.createFromCyJson(key, parsedNetworks[key])
//       networks[key] = network
//     })
//     return { state: { networks } }
//   },
// },
