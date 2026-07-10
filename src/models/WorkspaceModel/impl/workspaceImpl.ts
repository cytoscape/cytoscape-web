import { v4 as uuidv4 } from 'uuid'

import { AppStatus } from '../../AppModel/AppStatus'
import { InstalledApp } from '../../AppModel/InstalledApp'
import { IdType } from '../../IdType'
import { Workspace } from '../Workspace'

// const DEF_WORKSPACE_ID = 'newWorkspace'
export const DEF_WORKSPACE_NAME = 'Untitled Workspace'

export const createWorkspace = (): Workspace => {
  return {
    id: uuidv4(),
    name: DEF_WORKSPACE_NAME,
    networkIds: [],
    networkModified: {},
    creationTime: new Date(),
    localModificationTime: new Date(),
    currentNetworkId: '',
    isRemote: false,
  }
}

/**
 * Set the workspace id
 */
export const setId = (workspace: Workspace, id: IdType): Workspace => {
  return {
    ...workspace,
    id,
  }
}

/**
 * Set the workspace name
 */
export const setName = (workspace: Workspace, name: string): Workspace => {
  return {
    ...workspace,
    name,
  }
}

/**
 * Set the isRemote flag
 */
export const setIsRemote = (
  workspace: Workspace,
  isRemote: boolean,
): Workspace => {
  return {
    ...workspace,
    isRemote,
  }
}

/**
 * Set the current network id
 */
export const setCurrentNetworkId = (
  workspace: Workspace,
  currentNetworkId: IdType,
): Workspace => {
  return {
    ...workspace,
    currentNetworkId,
  }
}

/**
 * Add network ids to the workspace, preventing duplicates
 */
export const addNetworkIds = (
  workspace: Workspace,
  ids: IdType | IdType[],
): Workspace => {
  const idsList = Array.isArray(ids) ? ids : [ids]
  const uniqueIds = Array.from(new Set([...idsList, ...workspace.networkIds]))

  return {
    ...workspace,
    networkIds: uniqueIds,
  }
}

/**
 * Delete the current network from the workspace
 */
export const deleteCurrentNetwork = (workspace: Workspace): Workspace => {
  const idsWithoutCurrentNetworkId = workspace.networkIds.filter(
    (id) => id !== workspace.currentNetworkId,
  )

  const updatedWorkspace: Workspace = {
    ...workspace,
    networkIds: idsWithoutCurrentNetworkId,
  }

  // Clear currentNetworkId if no networks remain
  if (idsWithoutCurrentNetworkId.length === 0) {
    updatedWorkspace.currentNetworkId = ''
  }

  return updatedWorkspace
}

/**
 * Delete all networks from the workspace
 */
export const deleteAllNetworks = (workspace: Workspace): Workspace => {
  return {
    ...workspace,
    networkIds: [],
    networkModified: {},
    currentNetworkId: '',
  }
}

/**
 * Delete network(s) from the workspace by id
 */
export const deleteNetwork = (
  workspace: Workspace,
  id: IdType | IdType[],
): Workspace => {
  let newNetworkIds: IdType[] = []
  if (Array.isArray(id)) {
    const toBeDeleted = new Set(id)
    newNetworkIds = workspace.networkIds.filter(
      (netId: IdType) => !toBeDeleted.has(netId),
    )
  } else {
    newNetworkIds = workspace.networkIds.filter((netId) => netId !== id)
  }

  const updatedWorkspace: Workspace = {
    ...workspace,
    networkIds: newNetworkIds,
  }

  // Clear currentNetworkId if no networks remain
  if (newNetworkIds.length === 0) {
    updatedWorkspace.currentNetworkId = ''
  }

  return updatedWorkspace
}

/**
 * Set the modified status for a network
 */
export const setNetworkModified = (
  workspace: Workspace,
  networkId: IdType,
  isModified: boolean,
): Workspace => {
  return {
    ...workspace,
    networkModified: {
      ...workspace.networkModified,
      [networkId]: isModified,
    },
  }
}

/**
 * Delete the modified status for a network
 */
export const deleteNetworkModifiedStatus = (
  workspace: Workspace,
  networkId: IdType,
): Workspace => {
  const rest = { ...workspace.networkModified }
  delete rest[networkId]
  return {
    ...workspace,
    networkModified: rest,
  }
}

/**
 * Delete all network modified statuses
 */
export const deleteAllNetworkModifiedStatuses = (
  workspace: Workspace,
): Workspace => {
  return {
    ...workspace,
    networkModified: {},
  }
}

/**
 * Add or replace an installed app (upsert by entry.id). Preserves position
 * when replacing an existing record; appends a new one otherwise.
 */
export const addInstalledApp = (
  workspace: Workspace,
  app: InstalledApp,
): Workspace => {
  const existing = workspace.installedApps ?? []
  const index = existing.findIndex((a) => a.entry.id === app.entry.id)
  const installedApps =
    index >= 0
      ? existing.map((a, i) => (i === index ? app : a))
      : [...existing, app]
  return {
    ...workspace,
    installedApps,
  }
}

/**
 * Remove an installed app by id. No-op if absent.
 */
export const removeInstalledApp = (
  workspace: Workspace,
  id: IdType,
): Workspace => {
  const existing = workspace.installedApps ?? []
  return {
    ...workspace,
    installedApps: existing.filter((a) => a.entry.id !== id),
  }
}

/**
 * Update the status of an installed app. Returns the workspace unchanged if
 * the id is absent (the caller is responsible for warning).
 */
export const setInstalledAppStatus = (
  workspace: Workspace,
  id: IdType,
  status: AppStatus,
): Workspace => {
  const existing = workspace.installedApps ?? []
  return {
    ...workspace,
    installedApps: existing.map((a) =>
      a.entry.id === id ? { ...a, status } : a,
    ),
  }
}
