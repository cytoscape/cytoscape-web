/**
 * NDEx User API
 *
 * @module api/ndex/user
 */

import { getNdexClient } from './client'

/**
 * Fetches the NDEx account name of the signed-in user.
 *
 * Use this, not the Keycloak `preferred_username`, wherever NDEx expects an
 * account name (e.g. the `accountName` search filter). The two can differ.
 *
 * @param accessToken - Authentication token
 * @param ndexUrl - Optional NDEx base URL
 * @returns Promise resolving to the NDEx `userName`
 */
export const fetchNdexUserName = async (
  accessToken: string,
  ndexUrl?: string,
): Promise<string> => {
  const ndexClient = getNdexClient(accessToken, ndexUrl)
  const user = await ndexClient.user.getCurrentUser()
  return user.userName
}
