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
 * The base URL is automatically obtained from the module configuration if not provided.
 *
 * @param accessToken - Optional authentication token
 * @param url - Optional base URL (defaults to module configuration if not provided)
 * @returns Configured NDEx client instance
 */
export const getNdexClient = (accessToken?: string, url?: string): NDEx => {
  const baseUrl = url ?? getNDExBaseUrl()
  const client = new NDEx(baseUrl)

  if (accessToken) {
    client.setAuthToken(accessToken)
  }

  return client
}
