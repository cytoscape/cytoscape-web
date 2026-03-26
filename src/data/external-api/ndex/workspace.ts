import { Workspace } from '../../../models'
import { getNdexClient } from './client'

/**
 * Fetches the user's workspaces from NDEx.
 *
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to array of workspaces
 */
export const fetchMyNdexWorkspaces = async (
  accessToken: string,
  ndexUrl?: string,
): Promise<any[]> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const myWorkspaces = await ndexClient.workspace.getUserCyWebWorkspaces()
  return myWorkspaces as Workspace[]
}

/**
 * Fetches networks from the user's NDEx account.
 *
 * @param accessToken - Authentication token
 * @param offset - Optional offset for pagination (defaults to 0)
 * @param limit - Optional maximum number of networks to fetch (defaults to 1000)
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to array of networks from the user's account
 */
export const fetchMyNdexAccountNetworks = async (
  accessToken: string,
  offset?: number,
  limit?: number,
  ndexUrl?: string,
): Promise<any[]> => {
  const offsetValue = offset ?? 0
  const limitValue = limit ?? 1000
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const networks = await ndexClient.user.getAccountPageNetworks(
    (await ndexClient.user.authenticate()).externalId,
    offsetValue,
    limitValue,
  )
  return networks
}

/**
 * Searches for networks in NDEx.
 *
 * @param searchValue - Search query string
 * @param accessToken - Optional authentication token
 * @param offset - Optional offset for pagination (defaults to 0)
 * @param limit - Optional maximum number of networks to return (defaults to 1000)
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to search results containing networks
 */
export const searchNdexNetworks = async (
  searchValue: string,
  accessToken?: string,
  offset?: number,
  limit?: number,
  ndexUrl?: string,
): Promise<{ networks?: any[] }> => {
  const offsetValue = offset ?? 0
  const limitValue = limit ?? 1000
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const searchResults = await ndexClient.networks.v2.searchNetworks(
    searchValue,
    offsetValue,
    limitValue,
  )
  return searchResults ?? { networks: [] }
}

/**
 * Deletes a workspace from NDEx.
 *
 * @param workspaceId - Workspace UUID in NDEx
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving when deletion is complete
 */
export const deleteNdexWorkspace = async (
  workspaceId: string,
  accessToken: string,
  ndexUrl?: string,
): Promise<void> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  await ndexClient.workspace.deleteCyWebWorkspace(workspaceId)
}

/**
 * Creates a new workspace in NDEx.
 *
 * @param workspaceData - Workspace data including name, options, and network IDs
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to the created workspace response with UUID
 */
export const createNdexWorkspace = async (
  workspaceData: {
    name: string
    options: {
      currentNetwork: string
      activeApps: string[]
      serviceApps: string[]
    }
    networkIDs: string[]
  },
  accessToken: string,
  ndexUrl?: string,
): Promise<{ uuid: string }> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const response = await ndexClient.workspace.createCyWebWorkspace(workspaceData)
  return { uuid: response }
}

/**
 * Updates an existing workspace in NDEx.
 *
 * @param workspaceId - Workspace UUID in NDEx
 * @param workspaceData - Workspace data including name, options, and network IDs
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving when update is complete
 */
export const updateNdexWorkspace = async (
  workspaceId: string,
  workspaceData: {
    name: string
    options: {
      currentNetwork: string
      activeApps: string[]
      serviceApps: string[]
    }
    networkIDs: string[]
  },
  accessToken: string,
  ndexUrl?: string,
): Promise<void> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  await ndexClient.workspace.updateCyWebWorkspace(workspaceId, workspaceData)
}
