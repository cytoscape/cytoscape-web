/**
 * @deprecated The Module Federation exposure of this store (cyweb/NetworkSummaryStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/NetworkSummaryStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  clearNetworkSummaryFromDb,
  deleteNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'
import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import * as NetworkSummaryImpl from '../../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { NetworkSummaryStore } from '../../../models/StoreModel/NetworkSummaryStoreModel'
export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore>((set, get) => ({
    summaries: {},
    add: (networkId: IdType, summary: NetworkSummary) => {
      set((state) => {
        const newState = NetworkSummaryImpl.add(state, networkId, summary)
        putNetworkSummaryToDb(summary)
        state.summaries = newState.summaries
        return state
      })
    },
    addAll: (summaries: Record<IdType, NetworkSummary>) => {
      set((state) => {
        const newState = NetworkSummaryImpl.addAll(state, summaries)
        state.summaries = newState.summaries
        return state
      })
    },
    update: (networkId: IdType, summaryUpdate: Partial<NetworkSummary>) => {
      const summary = get().summaries[networkId]
      if (summary === undefined) {
        return
      }
      // Convert Immer proxy to plain object before saving
      const updatedSummary = toPlainObject({ ...summary, ...summaryUpdate })
      void putNetworkSummaryToDb(updatedSummary)
      set((state) => {
        const newState = NetworkSummaryImpl.update(
          state,
          networkId,
          summaryUpdate,
        )
        state.summaries = newState.summaries
        return state
      })
    },
    delete: (networkId: IdType) => {
      set((state) => {
        const newState = NetworkSummaryImpl.deleteSummary(state, networkId)
        void deleteNetworkSummaryFromDb(networkId)
          .then((val) => {
            logStore.info(
              `[${useNetworkSummaryStore.name}]: Summary deleted: ${networkId}`,
            )
          })
          .catch((err) => {
            logStore.error(
              `[${useNetworkSummaryStore.name}]: Error deleting summary: ${err}`,
            )
          })
        state.summaries = newState.summaries
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        const newState = NetworkSummaryImpl.deleteAll(state)
        clearNetworkSummaryFromDb()
          .then((val) => {
            logStore.info(
              `[${useNetworkSummaryStore.name}]: Summary cleared: ${val}`,
            )
          })
          .catch((err) => {
            logStore.error(
              `[${useNetworkSummaryStore.name}]: Failed to clear Summary: ${err}`,
            )
          })
        state.summaries = newState.summaries
        return state
      })
    },
  })),
)
