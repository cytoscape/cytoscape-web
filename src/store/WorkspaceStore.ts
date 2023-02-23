import create from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
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

  // Delete functions just remove networks from the workspace, but not from the database

  // Remove current network from workspace
  deleteCurrentNetwork: () => void

  // Remove all networks from the workspace
  deleteAllNetworks: () => void

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

export const useWorkspaceStore = create(
  subscribeWithSelector(
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
            // Add only new network IDs
            const newIds: IdType[] = ids.filter(
              (id) => !state.workspace.networkIds.includes(id),
            )
            const allIds = [...state.workspace.networkIds, ...newIds]
            const newWs = {
              workspace: {
                ...state.workspace,
                networkIds: allIds,
                networkModified: allIds.reduce(
                  (all, id) => ({
                    ...all,
                    [id]: false,
                  }),
                  {},
                ),
              },
            }
            void updateWorkspaceDb(newWs.workspace.id, {
              networkIds: newWs.workspace.networkIds,
            }).then()
            return newWs
          } else {
            const allIds = [...state.workspace.networkIds, ids]
            const newWs = {
              workspace: {
                ...state.workspace,
                networkIds: allIds,
                networkModified: allIds.reduce(
                  (all, id) => ({
                    ...all,
                    [id]: false,
                  }),
                  {},
                ),
              },
            }

            void updateWorkspaceDb(newWs.workspace.id, {
              networkIds: newWs.workspace.networkIds,
            }).then()
            return newWs
          }
        })
      },
      deleteCurrentNetwork: () => {
        set((state) => {
          const newWs = {
            workspace: {
              ...state.workspace,
              networkIds: state.workspace.networkIds.filter(
                (id) => id !== state.workspace.currentNetworkId,
              ),
            },
          }
          void updateWorkspaceDb(newWs.workspace.id, {
            networkIds: newWs.workspace.networkIds,
          }).then()
          return newWs
        })
      },
      deleteAllNetworks: () => {
        set((state) => {
          const newWs = {
            workspace: {
              ...state.workspace,
              networkIds: [],
              networkModified: {},
            },
          }
          void updateWorkspaceDb(newWs.workspace.id, {
            networkIds: [],
          }).then()
          return newWs
        })
      },

      setNetworkModified: (networkId: IdType, isModified: boolean) => {
        set((state) => {
          const newWs = {
            workspace: {
              ...state.workspace,
              networkModified: {
                ...state.workspace.networkModified,
                [networkId]: isModified,
              },
            },
          }
          // void updateWorkspaceDb(newWs.workspace.id, newWs).then()
          return newWs
        })
      },
    })),
  ),
)
