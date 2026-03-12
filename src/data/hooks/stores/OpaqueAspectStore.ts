/**
 * @deprecated The Module Federation exposure of this store (cyweb/OpaqueAspectStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/OpaqueAspectStore Module Federation export will be removed after 2 release cycles.
 */
import { clear } from 'idb-keyval'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { deleteOpaqueAspectsFromDb, putOpaqueAspectsToDb } from '../../db'
import { toPlainObject } from '../../db/serialization'
import { IdType } from '../../../models/IdType'
import { OpaqueAspects } from '../../../models/OpaqueAspectModel'
import * as OpaqueAspectImpl from '../../../models/OpaqueAspectModel/impl/opaqueAspectImpl'
import { OpaqueAspectStore } from '../../../models/StoreModel/OpaqueAspectStoreModel'

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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
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
      void deleteOpaqueAspectsFromDb(networkId).then(() => {})
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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    clearAspects: (networkId: string) => {
      set((state) => {
        const newState = OpaqueAspectImpl.clearAspects(state, networkId)
        // Empty object doesn't need cloning, but being consistent
        void putOpaqueAspectsToDb(networkId, toPlainObject({})).then(() => {})
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        const newState = OpaqueAspectImpl.deleteAll(state)
        void clear().then(() => {})
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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        state.opaqueAspects = newState.opaqueAspects
        return state
      })
    },
  })),
)
