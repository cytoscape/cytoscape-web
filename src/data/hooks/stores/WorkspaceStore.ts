import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { deleteDb, putWorkspaceToDb } from '../../db'
import { toPlainObject } from '../../db/serialization'
import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { WorkspaceStore } from '../../../models/StoreModel/WorkspaceStoreModel'
import { Workspace } from '../../../models/WorkspaceModel'
import * as WorkspaceImpl from '../../../models/WorkspaceModel/impl/workspaceImpl'

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  isRemote: false,
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
        logStore.info('[WorkspaceStore]: Persisting workspace store')
        const lastWorkspace = get().workspace
        set(args)
        const newWorkspace = get().workspace
        // const deleted = updated === undefined
        if (lastWorkspace !== newWorkspace && newWorkspace.id !== '') {
          // Convert Immer proxy to plain object before saving
          const plainWorkspace = toPlainObject(newWorkspace)
          void putWorkspaceToDb(plainWorkspace).then(() => {})
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
            state.workspace = WorkspaceImpl.setId(state.workspace, id)
            return state
          })
        },
        setCurrentNetworkId: (newId: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setCurrentNetworkId(
              state.workspace,
              newId,
            )
            return state
          })
        },
        setName: (name: string) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setName(state.workspace, name)
            return state
          })
        },
        setIsRemote: (isRemote: boolean) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setIsRemote(
              state.workspace,
              isRemote,
            )
            return state
          })
        },
        addNetworkIds: (ids: IdType | IdType[]) => {
          set((state) => {
            state.workspace = WorkspaceImpl.addNetworkIds(state.workspace, ids)
            return state
          })
        },
        deleteCurrentNetwork: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteCurrentNetwork(
              state.workspace,
            )
            return state
          })
        },
        deleteAllNetworks: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteAllNetworks(state.workspace)
            return state
          })
        },
        deleteNetwork: (id: IdType | IdType[]) => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteNetwork(state.workspace, id)
            return state
          })
        },
        resetWorkspace: async () => {
          await deleteDb()
          logStore.info(
            `[${useWorkspaceStore.name}]: IndexedDB cleared (Workspace cache has been reset)`,
          )
          set((state) => {
            logStore.info(
              `[${useWorkspaceStore.name}]: Now creating a new workspace`,
            )
            state.workspace = EMPTY_WORKSPACE
            return state
          })
        },

        setNetworkModified: (networkId: IdType, isModified: boolean) => {
          set((state) => {
            state.workspace = WorkspaceImpl.setNetworkModified(
              state.workspace,
              networkId,
              isModified,
            )
            return state
          })
        },

        deleteNetworkModifiedStatus: (networkId: IdType) => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteNetworkModifiedStatus(
              state.workspace,
              networkId,
            )
            return state
          })
        },

        deleteAllNetworkModifiedStatuses: () => {
          set((state) => {
            state.workspace = WorkspaceImpl.deleteAllNetworkModifiedStatuses(
              state.workspace,
            )
            return state
          })
        },
      })),
    ),
  ),
)
