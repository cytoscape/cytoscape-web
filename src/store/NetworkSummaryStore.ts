import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
import {
  clearNetworkSummaryFromDb,
  deleteNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from './persist/db'

interface NetworkSummaryState {
  summaries: Record<IdType, NdexNetworkSummary>
}

interface NetworkSummaryActions {
  // Add a network summary to the store
  add: (networkId: IdType, summary: NdexNetworkSummary) => void

  // Batch add network summaries to the store
  addAll: (summaries: Record<IdType, NdexNetworkSummary>) => void

  // Update an entry
  update: (id: IdType, summary: Partial<NdexNetworkSummary>) => void

  // Delete a network summary from the store
  delete: (networkId: IdType) => void

  // Delete all summaries from the store
  deleteAll: () => void
}

export type NetworkSummaryStore = NetworkSummaryState & NetworkSummaryActions

export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore>((set, get) => ({
    summaries: {},
    add: (networkId: IdType, summary: NdexNetworkSummary) => {
      set((state) => {
        state.summaries[networkId] = summary

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
            console.log('Summary deleted', networkId, val)
          })
          .catch((err) => {
            console.error('', err)
          })

        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        state.summaries = {}
        clearNetworkSummaryFromDb()
          .then((val) => {
            console.log('Summary cleared', val)
          })
          .catch((err) => {
            console.error('Failed to clear Summary', err)
          })

        return state
      })
    },
  })),
)
