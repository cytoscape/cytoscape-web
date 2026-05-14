/**
 * NDEx Permission Operations
 *
 * Functions for checking and managing network permissions in NDEx.
 */

import { getNdexClient } from './client'

// Access Permission Type to networks defined in the backend
export const PermissionType = {
  READ: 'READ',
  WRITE: 'WRITE',
  ADMIN: 'ADMIN',
} as const

type PermissionType = (typeof PermissionType)[keyof typeof PermissionType]

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
  const permissions = await (ndexClient.networks as any).getNetworkPermissionsByUUIDs([networkId])
  return (permissions as any)?.[networkId]
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
