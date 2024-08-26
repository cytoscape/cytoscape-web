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
import {
  NetworkStore,
  NetworkUpdatedEvent,
  UpdateEventType,
} from '../models/StoreModel/NetworkStoreModel'

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
        const updated: Network | undefined =
          get().networks.get(currentNetworkId)
        const deleted = updated === undefined
        if (!deleted) {
          console.debug('DB Update: network store', updated)
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
            if (nodeIds.length === 0) {
              return state
            }
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
            if (edgeIds.length === 0) {
              return state
            }

            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const deletedElements = NetworkFn.deleteEdges(network, edgeIds)

              const deletedEdges = deletedElements.edges()
              const deletedEdgeIds = deletedEdges.map((edge) => edge.id())
              const event: NetworkUpdatedEvent = {
                networkId,
                type: UpdateEventType.DELETE,
                payload: deletedEdgeIds,
              }
              state.lastUpdated = event
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

        /**
         *
         * Add a new network to the store
         *
         * @param network new network to be added
         * @returns
         */
        add: (network: Network) =>
          set((state) => {
            if (state.networks.has(network.id)) {
              console.warn('Network already exists in store', network.id)
              return state
            }

            const newNetworkMap = new Map(state.networks).set(
              network.id,
              network,
            )
            state.networks = newNetworkMap
            void putNetworkToDb(network)
              .then(() => {
                console.debug('* New network has been added to DB', network.id)
              })
              .catch((err) => {
                console.error('Failed adding network to DB', err)
              })
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
                console.log('Deleted all networks from db')
              })
              .catch((err) => {
                console.warn('Error clearing all networks from db', err)
              })

            return { ...state, networks: new Map<IdType, Network>() }
          }),
      })),
    ),
  ),
)
