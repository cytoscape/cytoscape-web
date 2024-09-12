import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Workspace } from '../models/WorkspaceModel'
import { deleteDb, putWorkspaceToDb } from './persist/db'
import { WorkspaceStore } from '../models/StoreModel/WorkspaceStoreModel'

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  networkIds: [],
  networkModified: {},
  creationTime: new Date(),
  localModificationTime: new Date(),
  currentNetworkId: '',
}

const persist =
  (config: StateCreator<WorkspaceStore>) =>
  (
    set: StoreApi<WorkspaceStore>['setState'],
    get: StoreApi<WorkspaceStore>['getState'],
    api: StoreApi<WorkspaceStore>,
  ) => {
    return config(
      (args) => {
        const lastWorkspace = get().workspace
        set(args)
        const newWorkspace = get().workspace
        // const deleted = updated === undefined
        if (lastWorkspace !== newWorkspace) {
          void putWorkspaceToDb(newWorkspace).then(() => {})
        }
      },
      get,
      api,
    )
  }
export const useWorkspaceStore = create(
  subscribeWithSelector(
    immer<WorkspaceStore>(
      persist((set) => ({
        workspace: EMPTY_WORKSPACE,
        set: (workspace: Workspace) => {
          set((state) => {
            state.workspace = workspace
            return state
          })
        },
        setId: (id: IdType) => {
          set((state) => {
            state.workspace.id = id
            return state
          })
        },
        setCurrentNetworkId: (newId: IdType) => {
          set((state) => {
            state.workspace.currentNetworkId = newId
            return state
          })
        },
        setName: (name: string) => {
          set((state) => {
            state.workspace.name = name
            return state
          })
        },
        addNetworkIds: (ids: IdType | IdType[]) => {
          set((state) => {
            const idsList = Array.isArray(ids) ? ids : [ids]
            const uniqueIds = Array.from(
              new Set([...idsList, ...state.workspace.networkIds]),
            )

            state.workspace.networkIds = uniqueIds
            return state
          })
        },
        deleteCurrentNetwork: () => {
          set((state) => {
            const idsWithoutCurrentNetworkId =
              state.workspace.networkIds.filter(
                (id) => id !== state.workspace.currentNetworkId,
              )
            state.workspace.networkIds = idsWithoutCurrentNetworkId
            if (idsWithoutCurrentNetworkId.length === 0) {
              state.workspace.currentNetworkId = ''
            }
            return state
          })
        },
        deleteAllNetworks: () => {
          set((state) => {
            state.workspace.networkIds = []
            state.workspace.networkModified = {}
            state.workspace.currentNetworkId = ''
            return state
          })
        },
        deleteNetwork: (id: IdType | IdType[]) => {
          set((state) => {
            let newNetworkIds: IdType[] = []
            if (Array.isArray(id)) {
              const toBeDeleted = new Set(id)
              newNetworkIds = state.workspace.networkIds.filter(
                (netId: IdType) => toBeDeleted.has(netId) === false,
              )
            } else {
              newNetworkIds = state.workspace.networkIds.filter(
                (netId) => netId !== id,
              )
            }
            state.workspace.networkIds = newNetworkIds

            if (newNetworkIds.length === 0) {
              state.workspace.currentNetworkId = ''
            }
            return state
          })
        },
        resetWorkspace: async () => {
          await deleteDb()
          console.log('Workspace cache has been reset')
          set((state) => {
            console.log('Now creating a new workspace')
            state.workspace = { ...EMPTY_WORKSPACE }
            return state
          })
        },

        setNetworkModified: (networkId: IdType, isModified: boolean) => {
          set((state) => {
            state.workspace.networkModified[networkId] = isModified
            return state
          })
        },

        deleteNetworkModifiedStatus: (networkId: IdType) => {
          set((state) => {
            delete state.workspace.networkModified[networkId]
            return state
          })
        },

        deleteAllNetworkModifiedStatuses: () => {
          set((state) => {
            state.workspace.networkModified = {}
            return state
          })
        },
      })),
    ),
  ),
)
