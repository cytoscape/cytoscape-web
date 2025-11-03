/**
 * NDEx Permission Operations
 *
 * Functions for checking and managing network permissions in NDEx.
 */
import { PermissionType } from '../../models/NetworkModel/AccessPermission'
import { getNdexClient } from './client'

/**
 * Fetches the permission level for a specific network from NDEx.
 *
 * @param networkId - Network UUID in NDEx
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to the permission type (READ, WRITE, or ADMIN), or undefined if not found
 */
export const getNdexNetworkPermission = async (
  networkId: string,
  accessToken: string,
  ndexUrl?: string,
): Promise<string | undefined> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const permissions = await ndexClient.getNetworkPermissionsByUUIDs([networkId])
  return permissions?.[networkId]
}

/**
 * Checks if the user has edit permission (WRITE or ADMIN) for a network in NDEx.
 *
 * @param networkId - Network UUID in NDEx
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to true if user has WRITE or ADMIN permission, false otherwise
 */
export const hasNdexEditPermission = async (
  networkId: string,
  accessToken: string,
  ndexUrl?: string,
): Promise<boolean> => {
  try {
    const permission = await getNdexNetworkPermission(
      networkId,
      accessToken,
      ndexUrl,
    )
    return (
      permission === PermissionType.ADMIN || permission === PermissionType.WRITE
    )
  } catch {
    return false
  }
}
