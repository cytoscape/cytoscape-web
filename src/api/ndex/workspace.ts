import { Workspace } from '../../models'
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
  const myWorkspaces = await ndexClient.getUserCyWebWorkspaces()
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
  const networks = await ndexClient.getAccountPageNetworks(
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
  const searchResults = await ndexClient.searchNetworks(
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
  await ndexClient.deleteCyWebWorkspace(workspaceId)
}
