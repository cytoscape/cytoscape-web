import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from '../../db'
import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import NetworkFn, { Edge, Network } from '../../../models/NetworkModel'
import * as NetworkStoreImpl from '../../../models/StoreModel/impl/networkStoreImpl'
import {
  NetworkStore,
  NetworkUpdatedEvent,
  UpdateEventType,
} from '../../../models/StoreModel/NetworkStoreModel'
import { useWorkspaceStore } from './WorkspaceStore'

const persist =
  (config: StateCreator<NetworkStore>) =>
  (
    set: StoreApi<NetworkStore>['setState'],
    get: StoreApi<NetworkStore>['getState'],
    api: StoreApi<NetworkStore>,
  ) =>
    config(
      async (args) => {
        logStore.info('[NetworkStore]: Persisting network store')
        const currentNetworkId: IdType =
          useWorkspaceStore.getState().workspace.currentNetworkId
        set(args)
        const updated: Network | undefined =
          get().networks.get(currentNetworkId)
        const deleted = updated === undefined
        if (!deleted) {
          logStore.info(`Network store updated for network ${currentNetworkId}`)
          // putNetworkToDb uses cyNetwork2Network which extracts plain data (id, nodes, edges)
          // so we don't need toPlainObject here - cyNetwork2Network handles the conversion
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

        setNetwork: (networkId: IdType, network: Network) => {
          set((state) => {
            const newState = NetworkStoreImpl.setNetwork(
              state,
              networkId,
              network,
            )
            state.networks = newState.networks
            return state
          })
        },

        addNode: (networkId: IdType, nodeId: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const updatedNetwork = NetworkStoreImpl.addNodeToNetwork(
                network,
                nodeId,
              )
              state.networks.set(networkId, updatedNetwork)
            }
            return state
          })
        },
        addNodes: (networkId: IdType, nodeIds: IdType[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const updatedNetwork = NetworkStoreImpl.addNodesToNetwork(
                network,
                nodeIds,
              )
              state.networks.set(networkId, updatedNetwork)
            }
            return state
          })
        },

        addNodesAndEdges: (
          networkId: IdType,
          nodeIds: IdType[],
          edges: Edge[],
        ) => {
          set((state) => {
            const network: Network | undefined = state.networks.get(networkId)
            if (network !== undefined) {
              const updatedNetwork = NetworkStoreImpl.addNodesAndEdgesToNetwork(
                network,
                nodeIds,
                edges,
              )
              state.networks.set(networkId, updatedNetwork)
            }
            return state
          })
        },

        /**
         * @deprecated Do not call directly! Use useDeleteNodes() hook instead.
         * Direct calls bypass proper cleanup of views, tables, bypasses, and summaries.
         * @internal Reserved for use by useDeleteNodes hook only.
         */
        deleteNodes: (networkId: IdType, nodeIds: IdType[]): Edge[] => {
          let deletedConnectingEdges: Edge[] = []

          set((state) => {
            if (nodeIds.length === 0) {
              return state
            }
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const { deletedElements, updatedNetwork } =
                NetworkStoreImpl.deleteNodesFromNetwork(network, nodeIds)
              const deletedEdgeObjects =
                NetworkStoreImpl.extractDeletedEdges(deletedElements)
              const event = NetworkStoreImpl.createDeleteNodesEvent(
                networkId,
                deletedElements,
              )
              state.networks.set(networkId, updatedNetwork)
              state.lastUpdated = event
              deletedConnectingEdges = deletedEdgeObjects
            } else {
              logStore.warn(
                `[${useNetworkStore.name}]: Network not found when deleting nodes`,
                networkId,
                nodeIds,
              )
            }
            return state
          })

          // Return the deleted edge objects and this will be used for undo / redo
          return deletedConnectingEdges
        },
        /**
         * @deprecated Do not call directly! Use useDeleteEdges() hook instead.
         * Direct calls bypass proper cleanup of views, tables, bypasses, and summaries.
         * @internal Reserved for use by useDeleteEdges hook only.
         */
        deleteEdges: (networkId: IdType, edgeIds: IdType[]) => {
          set((state) => {
            if (edgeIds.length === 0) {
              return state
            }

            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const { deletedElements, updatedNetwork } =
                NetworkStoreImpl.deleteEdgesFromNetwork(network, edgeIds)
              const event = NetworkStoreImpl.createDeleteEdgesEvent(
                networkId,
                deletedElements,
              )
              state.networks.set(networkId, updatedNetwork)
              state.lastUpdated = event
            }
            return state
          })
        },
        moveEdge: (
          networkId: IdType,
          edgeId: IdType,
          newSourceId: IdType,
          newTargetId: IdType,
        ): { oldSourceId: IdType; oldTargetId: IdType } => {
          const network = get().networks.get(networkId)
          if (network === undefined) {
            throw new Error(`Network ${networkId} not found`)
          }
          const result = NetworkFn.moveEdge(
            network,
            edgeId,
            newSourceId,
            newTargetId,
          )
          set((state) => {
            state.lastUpdated = {
              networkId,
              type: UpdateEventType.ADD,
              payload: [edgeId],
            }
            return state
          })
          return result
        },

        addEdge: (networkId: IdType, id: IdType, s: IdType, t: IdType) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const updatedNetwork = NetworkStoreImpl.addEdgeToNetwork(
                network,
                id,
                s,
                t,
              )
              state.networks.set(networkId, updatedNetwork)
            }
            return state
          })
        },
        addEdges: (networkId: IdType, edges: Edge[]) => {
          set((state) => {
            const network = state.networks.get(networkId)
            if (network !== undefined) {
              const updatedNetwork = NetworkStoreImpl.addEdgesToNetwork(
                network,
                edges,
              )
              state.networks.set(networkId, updatedNetwork)
            }
            return state
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
              logStore.warn(
                `[${useNetworkStore.name}]: Network already exists in store: ${network.id}`,
              )
            }

            const newState = NetworkStoreImpl.add(state, network)
            state.networks = newState.networks
            void putNetworkToDb(network)
              .then(() => {
                logStore.info(`New network has been added to DB: ${network.id}`)
              })
              .catch((err) => {
                logStore.error(`Failed adding network to DB: ${err}`)
              })
            return state
          }),
        delete: (networkId: IdType) =>
          set((state) => {
            const newState = NetworkStoreImpl.deleteNetwork(state, networkId)
            state.networks = newState.networks
            void deleteNetworkFromDb(networkId).then(() => {
              logStore.info(
                `[${useNetworkStore.name}]: Deleted network from db: ${networkId}`,
              )
            })
            return state
          }),
        deleteAll: () =>
          set((state) => {
            const newState = NetworkStoreImpl.deleteAll(state)
            clearNetworksFromDb()
              .then(() => {
                logStore.info(
                  `[${useNetworkStore.name}]: Deleted all networks from db`,
                )
              })
              .catch((err) => {
                logStore.error(
                  `[${useNetworkStore.name}]: Error clearing all networks from db: ${err}`,
                )
              })
            state.networks = newState.networks
            return state
          }),
      })),
    ),
  ),
)
