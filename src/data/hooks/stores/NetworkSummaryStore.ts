/**
 * @deprecated The Module Federation exposure of this store (cyweb/NetworkSummaryStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/NetworkSummaryStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { NetworkSummaryStore } from '../../../models/StoreModel/NetworkSummaryStoreModel'
import {
  clearNetworkSummaryFromDb,
  deleteNetworkSummaryFromDb,
  putNetworkSummaryToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'
const STORE_LABEL = 'NetworkSummaryStore'

export const useNetworkSummaryStore = create(
  immer<NetworkSummaryStore>((set, get) => ({
    summaries: {},
    add: (networkId: IdType, summary: NetworkSummary) => {
      set((state) => {
        state.summaries[networkId] = summary
      })
      if (!isHydrating()) {
        void putNetworkSummaryToDb(toPlainObject(summary)).catch((err) => {
          logStore.error(
            `[${STORE_LABEL}]: Failed to save summary ${networkId}: ${err}`,
          )
        })
      }
    },
    addAll: (summaries: Record<IdType, NetworkSummary>) => {
      set((state) => {
        Object.assign(state.summaries, summaries)
      })
    },
    update: (networkId: IdType, summaryUpdate: Partial<NetworkSummary>) => {
      const summary = get().summaries[networkId]
      if (summary === undefined) {
        return
      }
      // Convert Immer proxy to plain object before saving
      const updatedSummary = toPlainObject({ ...summary, ...summaryUpdate })
      if (!isHydrating()) {
        void putNetworkSummaryToDb(updatedSummary).catch((err) => {
          logStore.error(
            `[${STORE_LABEL}]: Failed to update summary ${networkId}: ${err}`,
          )
        })
      }
      set((state) => {
        const draftSummary = state.summaries[networkId]
        if (draftSummary !== undefined) {
          Object.assign(draftSummary, summaryUpdate)
        }
      })
    },
    delete: (networkId: IdType) => {
      set((state) => {
        delete state.summaries[networkId]
      })
      if (!isHydrating()) {
        void deleteNetworkSummaryFromDb(networkId)
          .then(() => {
            logStore.info(`[${STORE_LABEL}]: Summary deleted: ${networkId}`)
          })
          .catch((err) => {
            logStore.error(`[${STORE_LABEL}]: Error deleting summary: ${err}`)
          })
      }
    },
    deleteAll: () => {
      set((state) => {
        state.summaries = {}
      })
      if (!isHydrating()) {
        void clearNetworkSummaryFromDb()
          .then((val) => {
            logStore.info(`[${STORE_LABEL}]: Summary cleared: ${val}`)
          })
          .catch((err) => {
            logStore.error(`[${STORE_LABEL}]: Failed to clear Summary: ${err}`)
          })
      }
    },
  })),
)
