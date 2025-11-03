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
 * @returns Promise resolving to Cx2 network data
 */
export const fetchNetwork = async (
  ndexUuid: string,
  accessToken?: string,
): Promise<Cx2> => {
  const ndexClient = getNdexClient(accessToken)
  return await ndexClient.getCX2Network(ndexUuid)
}
