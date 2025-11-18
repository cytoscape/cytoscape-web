import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  clearNetworkSummaryFromDb,
  deleteNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from '../../db'
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
      const updatedSummary = { ...summary, ...summaryUpdate }
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
