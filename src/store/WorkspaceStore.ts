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

// Sample networks in dev server
const SAMPLE_NETWORKS: string[] = [
  '4acf76b6-23e0-11ed-9208-0242c246b7fb',
  'f33836d8-23df-11ed-9208-0242c246b7fb',
  'f9ca49da-3055-11ec-94bf-525400c25d22',
]

const EMPTY_WORKSPACE: Workspace = {
  id: '',
  name: '',
  networkIds: SAMPLE_NETWORKS,
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
