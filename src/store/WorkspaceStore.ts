import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Workspace } from '../models/WorkspaceModel'
import { deleteDb, putWorkspaceToDb } from './persist/db'

interface WorkspaceState {
  workspace: Workspace
}

interface WorkspaceActions {
  // Set current workspace for this session
  set: (workspace: Workspace) => void

  setId: (id: IdType) => void
  setName: (name: string) => void
  setCurrentNetworkId: (id: IdType) => void

  addNetworkIds: (ids: IdType | IdType[]) => void

  // Delete functions just remove networks from the workspace, but not from the database

  // Remove current network from workspace
  deleteCurrentNetwork: () => void

  deleteNetwork: (id: IdType) => void

  // Remove all networks from the workspace
  deleteAllNetworks: () => void

  // Remove all networks from the workspace and reset the workspace
  resetWorkspace: () => void

  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  networkIds: [],
  networkModified: {},
  creationTime: new Date(),
  localModificationTime: new Date(),
  currentNetworkId: '',
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

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
          void putWorkspaceToDb(newWorkspace).then(() => {
            console.log('-------------New WS Stored in DB')
          })
        }
      },
      get,
      api,
    )
  }
export const useWorkspaceStore = create(
  subscribeWithSelector(
    immer<WorkspaceStore & WorkspaceActions>(
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
        deleteNetwork: (id: IdType) => {
          set((state) => {
            const idsWithoutCurrentNetworkId =
              state.workspace.networkIds.filter((i) => i !== id)
            state.workspace.networkIds = idsWithoutCurrentNetworkId
            if (idsWithoutCurrentNetworkId.length === 0) {
              state.workspace.currentNetworkId = ''
            }
            return state
          })
        },
        resetWorkspace() {
          set((state) => {
            void deleteDb().then(() => {})
            return state
          })
        },

        setNetworkModified: (networkId: IdType, isModified: boolean) => {
          set((state) => {
            state.workspace.networkModified[networkId] = isModified
            return state
          })
        },
      })),
    ),
  ),
)
