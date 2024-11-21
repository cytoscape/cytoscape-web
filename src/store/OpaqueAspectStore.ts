import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { OpaqueAspectStoreModel } from '../models/StoreModel/OpaqueAspectStoreModel'
import { IdType } from '../models'
import { deleteOpaqueAspectsFromDb, putOpaqueAspectsToDb } from './persist/db'
import { clear } from 'idb-keyval'

export const useOpaqueAspectStore = create(
  immer<OpaqueAspectStoreModel>((set) => ({
    opaqueAspects: {},
    add: (networkId: IdType, aspectName: string, aspectData: any[]) => {
      set((state) => {
        if (!state.opaqueAspects[networkId]) {
          state.opaqueAspects[networkId] = {}
        }
        state.opaqueAspects[networkId][aspectName] = aspectData
        void putOpaqueAspectsToDb(
          networkId,
          state.opaqueAspects[networkId],
        ).then(() => {
          console.debug(
            'DB Update: opaque aspects store',
            state.opaqueAspects[networkId],
          )
        })
        return state
      })
    },
    addAll: (networkId: IdType, aspects: Record<string, any[]>[]) => {
      set((state) => {
        if (!state.opaqueAspects[networkId]) {
          state.opaqueAspects[networkId] = {}
        }
        aspects.forEach((aspect) => {
          const [aspectName, aspectData] = Object.entries(aspect)[0]
          state.opaqueAspects[networkId][aspectName] = aspectData
        })
        void putOpaqueAspectsToDb(
          networkId,
          state.opaqueAspects[networkId],
        ).then(() => {
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
        void putOpaqueAspectsToDb(
          networkId,
          state.opaqueAspects[networkId],
        ).then(() => {
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
        void putOpaqueAspectsToDb(
          networkId,
          state.opaqueAspects[networkId],
        ).then(() => {
          console.debug('DB Update: opaque aspects updated for ', networkId)
        })
        return state
      })
    },
  })),
)
