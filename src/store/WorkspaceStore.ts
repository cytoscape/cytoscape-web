import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Workspace } from '../models/WorkspaceModel'
import { getWorkspaceFromDb, updateWorkspaceDb } from './persist/db'

interface WorkspaceStore {
  workspace: Workspace
}

interface WorkspaceActions {
  init: () => void
  setId: (id: IdType) => void
  setName: (name: string) => void
  setCurrentNetworkId: (id: IdType) => void
  addNetworkIds: (ids: IdType | IdType[]) => void
}

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  networkIds: [],
  creationTime: new Date(),
  currentNetworkId: '',
}

export const useWorkspaceStore = create(
  immer<WorkspaceStore & WorkspaceActions>((set) => ({
    workspace: EMPTY_WORKSPACE,
    init: async () => {
      // This always return a workspace (existing or new)
      const newWs: Workspace = await getWorkspaceFromDb()
      set((state) => {
        return { workspace: newWs }
      })
    },
    setId: (id: IdType) => {
      set((state) => {
        return { workspace: { ...state.workspace, id } }
      })
    },
    setCurrentNetworkId: (newId: IdType) => {
      set((state) => {
        return {
          workspace: { ...state.workspace, currentNetworkId: newId },
        }
      })
    },

    setName: (name: string) => {
      set((state) => {
        return {
          workspace: { ...state.workspace, name },
        }
      })
    },
    addNetworkIds: (ids: IdType | IdType[]) => {
      set((state) => {
        if (Array.isArray(ids)) {
          const newWs = {
            workspace: {
              ...state.workspace,
              networkIds: [...state.workspace.networkIds, ...ids],
            },
          }
          void updateWorkspaceDb(newWs.workspace.id, {
            networkIds: newWs.workspace.networkIds,
          }).then()
          return newWs
        } else {
          const newWs = {
            workspace: {
              ...state.workspace,
              networkIds: [...state.workspace.networkIds, ids],
            },
          }

          void updateWorkspaceDb(newWs.workspace.id, {
            networkIds: newWs.workspace.networkIds,
          }).then()
          return newWs
        }
      })
    },
  })),
)
