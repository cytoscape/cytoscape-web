import { clear } from 'idb-keyval'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { deleteOpaqueAspectsFromDb, putOpaqueAspectsToDb } from '../../db'
import { IdType } from '../../models/IdType'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { OpaqueAspectStore } from '../../models/StoreModel/OpaqueAspectStoreModel'

export const useOpaqueAspectStore = create(
  immer<OpaqueAspectStore>((set) => ({
    opaqueAspects: {},
    add: (networkId: IdType, aspectName: string, aspectData: any[]) => {
      set((state) => {
        if (!state.opaqueAspects[networkId]) {
          state.opaqueAspects[networkId] = {}
        }
        state.opaqueAspects[networkId][aspectName] = aspectData
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        return state
      })
    },
    addAll: (
      networkId: IdType,
      aspects: OpaqueAspects[],
      isUpdate: boolean = false,
    ) => {
      set((state) => {
        if (!state.opaqueAspects[networkId] || isUpdate) {
          state.opaqueAspects[networkId] = {}
        }
        aspects.forEach((aspect) => {
          const [aspectName, aspectData] = Object.entries(aspect)[0]
          state.opaqueAspects[networkId][aspectName] = aspectData
        })
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        return state
      })
    },
    delete: (networkId: IdType) => {
      if (networkId === undefined) {
        return
      }
      set((state) => {
        delete state.opaqueAspects[networkId]
        return state
      })
      void deleteOpaqueAspectsFromDb(networkId).then(() => {})
    },
    deleteSingleAspect: (networkId: IdType, aspectName: string) => {
      set((state) => {
        if (state.opaqueAspects[networkId]) {
          delete state.opaqueAspects[networkId][aspectName]
        }
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        return state
      })
    },
    clearAspects: (networkId: string) => {
      set((state) => {
        state.opaqueAspects[networkId] = {}
        void putOpaqueAspectsToDb(networkId, {}).then(() => {})
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        state.opaqueAspects = {}
        void clear().then(() => {})
        return state
      })
    },
    update: (networkId: IdType, aspectName: string, aspectData: any[]) => {
      set((state) => {
        if (!state.opaqueAspects[networkId]) {
          state.opaqueAspects[networkId] = {}
        }
        state.opaqueAspects[networkId][aspectName] = [...aspectData]
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(
          () => {},
        )
        return state
      })
    },
  })),
)
