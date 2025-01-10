import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { OpaqueAspectStore } from '../models/StoreModel/OpaqueAspectStoreModel'
import { IdType } from '../models'
import { deleteOpaqueAspectsFromDb, putOpaqueAspectsToDb } from './persist/db'
import { clear } from 'idb-keyval'
import { OpaqueAspects } from '../models/OpaqueAspectModel'

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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(() => {
          console.debug(
            'DB Update: opaque aspects store',
            state.opaqueAspects[networkId],
          )
        })
        return state
      })
    },
    addAll: (networkId: IdType, aspects: OpaqueAspects[]) => {
      set((state) => {
        if (!state.opaqueAspects[networkId]) {
          state.opaqueAspects[networkId] = {}
        }
        aspects.forEach((aspect) => {
          const [aspectName, aspectData] = Object.entries(aspect)[0]
          state.opaqueAspects[networkId][aspectName] = aspectData
        })
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(() => {
          console.debug('DB Update: opaque aspects store')
        })
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
      void deleteOpaqueAspectsFromDb(networkId).then(() => {
        console.debug('DB Delete: opaque aspect for the network', networkId)
      })
    },
    deleteSingleAspect: (networkId: IdType, aspectName: string) => {
      set((state) => {
        if (state.opaqueAspects[networkId]) {
          delete state.opaqueAspects[networkId][aspectName]
        }
        const updatedOpaqueAspects = { ...state.opaqueAspects[networkId] }
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(() => {
          console.debug('DB Update: opaque aspects store')
        })
        return state
      })
    },
    clearAspects: (networkId: string) => {
      set((state) => {
        state.opaqueAspects[networkId] = {}
        void putOpaqueAspectsToDb(networkId, {}).then(() => {
          console.debug('DB Update: opaque aspects cleared for ', networkId)
        })
        return state
      })
    },
    deleteAll: () => {
      set((state) => {
        state.opaqueAspects = {}
        void clear().then(() => {
          console.debug('DB Clear: opaque aspects')
        })
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
        void putOpaqueAspectsToDb(networkId, updatedOpaqueAspects).then(() => {
          console.debug('DB Update: opaque aspects updated for ', networkId)
        })
        return state
      })
    },
  })),
)
