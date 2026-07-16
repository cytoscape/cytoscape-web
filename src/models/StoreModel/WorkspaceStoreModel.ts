import { AppStatus } from '../AppModel/AppStatus'
import { InstalledApp } from '../AppModel/InstalledApp'
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
  setIsRemote: (isRemote: boolean) => void

  setCurrentNetworkId: (id: IdType) => void

  addNetworkIds: (ids: IdType | IdType[]) => void

  // Delete functions just remove networks from the workspace, but not from the database

  // Remove current network from workspace
  deleteCurrentNetwork: () => void

  deleteNetwork: (id: IdType | IdType[]) => void

  // Remove all networks from the workspace
  deleteAllNetworks: () => void

  // Remove all networks from the workspace and reset the workspace
  resetWorkspace: () => Promise<void>

  // Change modified flag for a network
  setNetworkModified: (networkId: IdType, isModified: boolean) => void

  // Remove networkId modified status
  deleteNetworkModifiedStatus: (networkId: IdType) => void

  deleteAllNetworkModifiedStatuses: () => void

  // Installed apps (workspace-scoped app install records).
  // Must only be called after workspace hydration (workspace.id !== ''),
  // otherwise the persist wrapper silently drops the write.

  // Add or replace an installed app (upsert by entry.id)
  addInstalledApp: (app: InstalledApp) => void

  // Remove an installed app by id
  removeInstalledApp: (id: IdType) => void

  // Update the status of an installed app; no-op + warning if id is absent
  setInstalledAppStatus: (id: IdType, status: AppStatus) => void
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions
