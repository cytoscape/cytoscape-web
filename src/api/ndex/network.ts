/**
 * NDEx Network Operations
 *
 * Functions for fetching and managing networks from NDEx.
 */
import { Cx2 } from '../../models/CxModel/Cx2'
import { getNdexClient } from './client'

/**
 * Fetches a network from NDEx by UUID.
 *
 * @param ndexUuid - Network UUID in NDEx
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving to Cx2 network data
 */
export const fetchNdexNetwork = async (
  ndexUuid: string,
  accessToken?: string,
  ndexUrl?: string,
): Promise<Cx2> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  return await ndexClient.getCX2Network(ndexUuid)
}

/**
 * Updates a network in NDEx with new CX2 data.
 *
 * @param networkId - Network UUID in NDEx
 * @param cx - Cx2 network data to update
 * @param accessToken - Optional authentication token
 * @param ndexUrl - Optional NDEx base URL (defaults to module configuration if not provided)
 * @returns Promise resolving when update is complete
 */
export const updateNdexNetwork = async (
  networkId: string,
  cx: Cx2,
  accessToken?: string,
  ndexUrl?: string,
): Promise<void> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  return await ndexClient.updateNetworkFromRawCX2(networkId, cx)
}
