/**
 * NDEx Client Configuration
 *
 * Provides low-level client initialization and configuration for NDEx API access.
 */
// TODO: Make client TS compatible
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNDExBaseUrl } from './config'

/**
 * Creates a new NDEx client instance with the configured URL and authentication token.
 *
 * The base URL is automatically obtained from the module configuration.
 *
 * @param accessToken - Optional authentication token
 * @returns Configured NDEx client instance
 */
export const getNdexClient = (accessToken?: string): NDEx => {
  const url = getNDExBaseUrl()
  const client = new NDEx(url)

  if (accessToken) {
    client.setAuthToken(accessToken)
  }

  return client
}
