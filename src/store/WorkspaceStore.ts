import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'
import { Workspace } from '../models/WorkspaceModel'
import { getWorkspaceFromDb } from './persist/db'

interface WorkspaceStore {
  workspace: Workspace
}

interface WorkspaceActions {
  init: () => void
  setId: (id: IdType) => void
  setName: (name: string) => void
  setCurrentNetworkId: (id: IdType) => void
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
      const newWs: Workspace = await getWorkspaceFromDb()

      set((state) => {
        const newState = { ...state, workspace: newWs }
        return newState
      })
    },
    setId: (id: IdType) => {
      set((state) => {
        return { ...state, workspace: { ...state.workspace, id } }
      })
    },
    setCurrentNetworkId: (newId: IdType) => {
      set((state) => {
        return {
          ...state,
          workspace: { ...state.workspace, currentNetworkId: newId },
        }
      })
    },

    setName: (name: string) => {
      set((state) => {
        return { ...state, name }
      })
    },
  })),
)
