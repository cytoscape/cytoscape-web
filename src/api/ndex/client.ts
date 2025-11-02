/**
 * NDEx Client Configuration
 *
 * Provides low-level client initialization and configuration for NDEx API access.
 */
// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

const DEFAULT_URL = 'dev.ndexbio.org'
let ndexClient: NDEx = new NDEx(DEFAULT_URL)

/**
 * Gets or creates an NDEx client instance with the specified URL and authentication token.
 *
 * The client is cached and reused if the URL hasn't changed. If the URL changes,
 * a new client instance is created.
 *
 * @param url - NDEx server URL (uses default if empty or undefined)
 * @param accessToken - Optional authentication token
 * @returns Configured NDEx client instance
 */
export const getNdexClient = (url: string, accessToken?: string): NDEx => {
  if (url === undefined || url === '') {
    ndexClient = new NDEx(DEFAULT_URL)
  } else if (url !== ndexClient.host) {
    ndexClient = new NDEx(url)
  }

  if (accessToken !== undefined && accessToken !== '') {
    ndexClient.setAuthToken(accessToken)
  }
  return ndexClient
}
