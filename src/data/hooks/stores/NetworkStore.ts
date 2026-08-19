/**
 * @deprecated The Module Federation exposure of this store (cyweb/NetworkStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/NetworkStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import NetworkFn, { Edge, Network } from '../../../models/NetworkModel'
import * as NetworkStoreImpl from '../../../models/StoreModel/impl/networkStoreImpl'
import {
  NetworkStore,
  UpdateEventType,
} from '../../../models/StoreModel/NetworkStoreModel'
import {
  clearNetworksFromDb,
  deleteNetworkFromDb,
  putNetworkToDb,
} from '../../db'
import { cancelWrite, scheduleWrite } from './persistenceScheduler'
import { isHydrating } from './hydrationContext'

/**
 * Persist one network to IndexedDB, keyed by the network that was actually
 * mutated (REVIEW.md R2-2). Networks are cy-backed and mutate in place, so
 * a set()-level identity diff (persistNetworkSlices) cannot detect changes
 * — every mutating action must call this explicitly after its set().
 *
 * Writes are coalesced (REVIEW.md A2): the network is read from the store
 * at flush time, so a burst of topology mutations produces one put of the
 * latest state. putNetworkToDb uses cyNetwork2Network, which extracts
 * plain data (id, nodes, edges), so no toPlainObject conversion is needed.
 */
const persistNetwork = (networkId: IdType): void => {
  if (isHydrating()) return
  scheduleWrite(`NetworkStore:${networkId}`, 'NetworkStore', () => {
    const network = useNetworkStore.getState().networks.get(networkId)
    if (network === undefined) {
      // Deleted while the write was pending
      return Promise.resolve()
    }
    return putNetworkToDb(network)
  })
}

export const useNetworkStore = create(
  subscribeWithSelector(
    immer<NetworkStore>((set, get) => ({
      networks: new Map<IdType, Network>(),
      lastUpdated: undefined,
      topologyVersions: new Map<IdType, number>(),

      setNetwork: (networkId: IdType, network: Network) => {
        set((state) => {
          const newState = NetworkStoreImpl.setNetwork(
            state,
            networkId,
            network,
          )
          state.networks = newState.networks
          NetworkStoreImpl.bumpTopologyVersion(state.topologyVersions, networkId)
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
          }
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
          }
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
          }
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
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
        persistNetwork(networkId)

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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
            state.lastUpdated = event
          }
          return state
        })
        persistNetwork(networkId)
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
          NetworkStoreImpl.bumpTopologyVersion(state.topologyVersions, networkId)
          state.lastUpdated = {
            networkId,
            type: UpdateEventType.ADD,
            payload: [edgeId],
          }
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
          }
          return state
        })
        persistNetwork(networkId)
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
            NetworkStoreImpl.bumpTopologyVersion(
              state.topologyVersions,
              networkId,
            )
          }
          return state
        })
        persistNetwork(networkId)
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
          // Registers the network with the version map so topology
          // subscribers can snapshot it before the first mutation
          NetworkStoreImpl.bumpTopologyVersion(
            state.topologyVersions,
            network.id,
          )
          if (!isHydrating()) {
            void putNetworkToDb(network)
              .then(() => {
                logStore.info(`New network has been added to DB: ${network.id}`)
              })
              .catch((err) => {
                logStore.error(`Failed adding network to DB: ${err}`)
              })
          }
          return state
        }),
      delete: (networkId: IdType) =>
        set((state) => {
          const newState = NetworkStoreImpl.deleteNetwork(state, networkId)
          state.networks = newState.networks
          state.topologyVersions.delete(networkId)
          // A stale pending put must never resurrect the deleted row
          cancelWrite(`NetworkStore:${networkId}`)
          if (!isHydrating()) {
            void deleteNetworkFromDb(networkId).then(() => {
              logStore.info(
                `[${useNetworkStore.name}]: Deleted network from db: ${networkId}`,
              )
            })
          }
          return state
        }),
      deleteAll: () =>
        set((state) => {
          for (const networkId of state.networks.keys()) {
            cancelWrite(`NetworkStore:${networkId}`)
          }
          const newState = NetworkStoreImpl.deleteAll(state)
          if (!isHydrating()) {
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
          }
          state.networks = newState.networks
          state.topologyVersions = new Map<IdType, number>()
          return state
        }),
    })),
  ),
)
