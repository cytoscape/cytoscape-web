import { IdType } from '../IdType'
import { Workspace } from '../WorkspaceModel'

export interface WorkspaceState {
  workspace: Workspace
}

export interface WorkspaceActions {
  // Set current workspace for this session
  set: (workspace: Workspace) => void

  setId: (id: IdType) => void
  setName: (name: string) => void
  setCurrentNetworkId: (id: IdType) => void

  addNetworkIds: (ids: IdType | IdType[]) => void

  // Delete functions just remove networks from the workspace, but not from the database

  // Remove current network from workspace
  deleteCurrentNetwork: () => void

  deleteNetwork: (id: IdType | IdType[]) => void

  // Remove all networks from the workspace
  deleteAllNetworks: () => void

  // Remove all networks from the workspace and reset the workspace
  resetWorkspace: () => void

  // Change modified flag for a network
  setNetworkModified: (networkId: IdType, isModified: boolean) => void

  // Remove networkId modified status
  deleteNetworkModifiedStatus: (networkId: IdType) => void

  deleteAllNetworkModifiedStatuses: () => void
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions
