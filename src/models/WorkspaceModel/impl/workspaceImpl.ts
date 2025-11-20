import { v4 as uuidv4 } from 'uuid'

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
  const { [networkId]: _, ...rest } = workspace.networkModified
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
