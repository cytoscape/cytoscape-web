// src/data/hooks/stores/AppDataStore.ts
//
// The app API's LOCAL per-app data tier (`appData.set(..., { export: false })`,
// the default). Entries here never leave the browser: they are not opaque
// aspects, so no CX2 export, NDEx save or "Open in Cytoscape" path can see
// them. The opt-in exported tier lives in `OpaqueAspectStore` under the
// `cyAppData` aspect instead.
//
// Reads are synchronous, so the whole store is hydrated once during the boot
// WORKSPACE phase — before the app API is marked ready. That is also why a
// per-entry size cap exists in `appDataApi`.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'

import { AppDataRow } from '@/models/AppDataModel'
import * as AppDataImpl from '@/models/AppDataModel/impl/appDataImpl'
import { appDataRowId } from '@/models/AppDataModel/impl/appDataImpl'
import { IdType } from '@/models/IdType'
import { AppDataStore } from '@/models/StoreModel/AppDataStoreModel'
import {
  clearAppDataFromDb,
  deleteAppDataFromDb,
  deleteNetworkAppDataFromDb,
  deleteNetworkScopedAppDataFromDb,
  getAllAppDataFromDb,
  putAppDataToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'

/**
 * Fire-and-forget persistence. App data is derived state an app can always
 * recompute, so a failed write is logged and the in-memory value stands rather
 * than failing the app's `set()` call — which is synchronous and has already
 * returned by the time the write lands.
 */
const persist = (row: AppDataRow): void => {
  void putAppDataToDb(row).catch((e) => {
    logStore.error(
      `[${useAppDataStore.name}]: Failed to persist app data ${row.id}`,
      e,
    )
  })
}

const unpersist = (id: string): void => {
  void deleteAppDataFromDb(id).catch((e) => {
    logStore.error(
      `[${useAppDataStore.name}]: Failed to delete app data ${id}`,
      e,
    )
  })
}

export const useAppDataStore = create(
  immer<AppDataStore>((set) => ({
    appData: {},

    hydrate: async () => {
      const rows = await getAllAppDataFromDb()
      if (rows.length === 0) {
        return
      }
      const entries = AppDataImpl.fromRows(rows)
      set((state) => {
        state.appData = entries
        return state
      })
    },

    set: (networkId: IdType, appId: string, key: string, value: unknown) => {
      set((state) => {
        const newState = AppDataImpl.setEntry(
          state,
          networkId,
          appId,
          key,
          value,
        )
        state.appData = newState.appData
        return state
      })
      persist({
        id: appDataRowId(appId, networkId, key),
        appId,
        networkId,
        key,
        // The caller's value is already a plain JSON round trip, but it goes
        // through the store first and therefore arrives as an Immer proxy.
        value: toPlainObject(value),
      })
    },

    remove: (networkId: IdType, appId: string, key: string) => {
      set((state) => {
        const newState = AppDataImpl.removeEntry(state, networkId, appId, key)
        state.appData = newState.appData
        return state
      })
      unpersist(appDataRowId(appId, networkId, key))
    },

    deleteNetwork: (networkId: IdType) => {
      set((state) => {
        const newState = AppDataImpl.deleteNetwork(state, networkId)
        state.appData = newState.appData
        return state
      })
      void deleteNetworkAppDataFromDb(networkId).catch((e) => {
        logStore.error(
          `[${useAppDataStore.name}]: Failed to delete app data for network ${networkId}`,
          e,
        )
      })
    },

    deleteAllNetworks: () => {
      set((state) => {
        const newState = AppDataImpl.deleteAllNetworks(state)
        state.appData = newState.appData
        return state
      })
      void deleteNetworkScopedAppDataFromDb().catch((e) => {
        logStore.error(
          `[${useAppDataStore.name}]: Failed to delete network-scoped app data`,
          e,
        )
      })
    },

    deleteAll: () => {
      set((state) => {
        const newState = AppDataImpl.deleteAll(state)
        state.appData = newState.appData
        return state
      })
      void clearAppDataFromDb().catch((e) => {
        logStore.error(`[${useAppDataStore.name}]: Failed to clear app data`, e)
      })
    },
  })),
)
