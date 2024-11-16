import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { OpaqueAspectStoreModel } from '../models/StoreModel/OpaqueAspectStoreModel'

export const useOpaqueAspectStore = create(
  immer<OpaqueAspectStoreModel>((set) => ({
    opaqueAspects: {},
    add: (aspectName, aspectData) => {
      set((state) => {
        state.opaqueAspects[aspectName] = aspectData
        return state
      })
    },
    delete: (aspectName) => {
      set((state) => {
        delete state.opaqueAspects[aspectName]
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        state.opaqueAspects = {}
        return state
      })
    },
    update: (aspectName, aspectData) => {
      set((state) => {
        state.opaqueAspects[aspectName] = [...aspectData]
        return state
      })
    },
  })),
)
