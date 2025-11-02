import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import {
  clearNetworkSummaryFromDb,
  deleteNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from '../../db'
import { NetworkSummaryStore } from '../../models/StoreModel/NetworkSummaryStoreModel'
import { logStore } from '../../debug'
export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore>((set, get) => ({
    summaries: {},
    add: (networkId: IdType, summary: NdexNetworkSummary) => {
      set((state) => {
        state.summaries[networkId] = summary
        putNetworkSummaryToDb(summary)

        return state
      })
    },
    addAll: (summaries: Record<IdType, NdexNetworkSummary>) => {
      set((state) => {
        state.summaries = { ...state.summaries, ...summaries }

        return state
      })
    },
    update: (networkId: IdType, summaryUpdate: Partial<NdexNetworkSummary>) => {
      const summary = get().summaries[networkId]
      if (summary === undefined) {
        return
      }
      void putNetworkSummaryToDb({ ...summary, ...summaryUpdate })
      set((state) => {
        state.summaries[networkId] = { ...summary, ...summaryUpdate }
        return state
      })
    },
    delete: (networkId: IdType) => {
      set((state) => {
        delete state.summaries[networkId]
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

        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        state.summaries = {}
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

        return state
      })
    },
  })),
)
