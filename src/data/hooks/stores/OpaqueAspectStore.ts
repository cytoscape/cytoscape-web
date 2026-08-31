/**
 * @deprecated The Module Federation exposure of this store (cyweb/OpaqueAspectStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/OpaqueAspectStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'

import { IdType } from '../../../models/IdType'
import { OpaqueAspects } from '../../../models/OpaqueAspectModel'
import * as OpaqueAspectImpl from '../../../models/OpaqueAspectModel/impl/opaqueAspectImpl'
import { OpaqueAspectStore } from '../../../models/StoreModel/OpaqueAspectStoreModel'
import {
  clearOpaqueAspectsFromDb,
  deleteOpaqueAspectsFromDb,
  putOpaqueAspectsToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'
import { trackWrite } from './trackWrite'

/**
 * Persistence helpers that stand down during cross-tab hydration.
 *
 * Hydration applies a peer tab's aspects to this store; writing them back would
 * mint a fresh change record that every other tab would hydrate in turn. This
 * store was the one hydrated store with no such guard, and it only avoided an
 * endless write loop because dexie-observable happens to drop no-op diffs —
 * i.e. it depended on byte-identical re-serialization.
 *
 * `isHydrating()` is only ever true inside hydration's synchronous apply phase,
 * so a genuine user edit can never be suppressed by these.
 */
const persistAspects = (networkId: IdType, aspects: OpaqueAspects): void => {
  if (isHydrating()) {
    return
  }
  void trackWrite(putOpaqueAspectsToDb(networkId, aspects)).catch((e) => {
    logStore.error(
      `[${useOpaqueAspectStore.name}]: Failed to persist opaque aspects for ${networkId}`,
      e,
    )
  })
}

const removeAspects = (networkId: IdType): void => {
  if (isHydrating()) {
    return
  }
  void trackWrite(deleteOpaqueAspectsFromDb(networkId)).catch((e) => {
    logStore.error(
      `[${useOpaqueAspectStore.name}]: Failed to delete opaque aspects for ${networkId}`,
      e,
    )
  })
}

const removeAllAspects = (): void => {
  if (isHydrating()) {
    return
  }
  void trackWrite(clearOpaqueAspectsFromDb()).catch((e) => {
    logStore.error(
      `[${useOpaqueAspectStore.name}]: Failed to clear opaque aspects`,
      e,
    )
  })
}

export const useOpaqueAspectStore = create(
  immer<OpaqueAspectStore>((set) => ({
    opaqueAspects: {},
    add: (networkId: IdType, aspectName: string, aspectData: any[]) => {
      set((state) => {
        const newState = OpaqueAspectImpl.add(
          state,
          networkId,
          aspectName,
          aspectData,
        )
        // Convert Immer proxy to plain object before saving
        const updatedOpaqueAspects = toPlainObject(
          newState.opaqueAspects[networkId] || {},
        )
        persistAspects(networkId, updatedOpaqueAspects)
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    addAll: (
      networkId: IdType,
      aspects: OpaqueAspects[],
      isUpdate: boolean = false,
    ) => {
      set((state) => {
        const newState = OpaqueAspectImpl.addAll(
          state,
          networkId,
          aspects,
          isUpdate,
        )
        // Convert Immer proxy to plain object before saving
        const updatedOpaqueAspects = toPlainObject(
          newState.opaqueAspects[networkId] || {},
        )
        persistAspects(networkId, updatedOpaqueAspects)
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    delete: (networkId: IdType) => {
      if (networkId === undefined) {
        return
      }
      set((state) => {
        const newState = OpaqueAspectImpl.deleteAspects(state, networkId)
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
      removeAspects(networkId)
    },
    deleteSingleAspect: (networkId: IdType, aspectName: string) => {
      set((state) => {
        const newState = OpaqueAspectImpl.deleteSingleAspect(
          state,
          networkId,
          aspectName,
        )
        // Convert Immer proxy to plain object before saving
        const updatedOpaqueAspects = toPlainObject(
          newState.opaqueAspects[networkId] || {},
        )
        persistAspects(networkId, updatedOpaqueAspects)
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    clearAspects: (networkId: string) => {
      set((state) => {
        const newState = OpaqueAspectImpl.clearAspects(state, networkId)
        // Empty object doesn't need cloning, but being consistent
        persistAspects(networkId, toPlainObject({}))
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        const newState = OpaqueAspectImpl.deleteAll(state)
        removeAllAspects()
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    update: (networkId: IdType, aspectName: string, aspectData: any[]) => {
      set((state) => {
        const newState = OpaqueAspectImpl.update(
          state,
          networkId,
          aspectName,
          aspectData,
        )
        // Convert Immer proxy to plain object before saving
        const updatedOpaqueAspects = toPlainObject(
          newState.opaqueAspects[networkId] || {},
        )
        persistAspects(networkId, updatedOpaqueAspects)
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
  })),
)
