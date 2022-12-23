import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
// import { deleteNetworkFromDb } from './persist/db'
// import { persist, StateStorage } from 'zustand/middleware'
// import { db, putNetworkToDb, addTables, getNetworkFromDB } from './persist/db'

/**
 * Network State manager based on zustand
 */
interface WorkspaceState {
  id: IdType
  name: string
  modificationTime?: Date
  creationTime?: Date
  options?: any
  networks: Record<IdType, Network>
}

/**
 * Actions to mutate network structure
 */
interface UpdateAction {
  addNode: (networkId: IdType, nodeId: IdType) => void
  addNodes: (networkId: IdType, nodeIds: IdType[]) => void
  deleteNode: (networkId: IdType, nodeId: IdType) => void
  addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => void
}

interface NetworkAction {
  add: (network: Network) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
}

// interface WorkspaceAction {
//   setTime: (modificationTime: Date) => void
//   setName: (name: string) => void
//   setOptions: (options: any) => void
// }

export const useWorkspaceStore = create(
  immer<WorkspaceState & NetworkAction & UpdateAction>((set) => ({
    id: '-' as IdType,
    name: 'workspace',
    networks: {},
    creationTime: new Date(),

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

    addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => {
      set((state) => {
        const network = state.networks[networkId]
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
        return {
          networks: { ...state.networks, [network.id]: network },
        }
      }),
    delete: (networkId: IdType) =>
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete state.networks[networkId]
        // await deleteNetworkFromDb(networkId)
        return {
          networks: { ...state.networks },
        }
      }),
    deleteAll: () => set({ networks: {} }),
  })),
)
