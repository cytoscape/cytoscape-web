import { NDExClient } from '@js4cytoscape/ndex-client'

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
export const getNdexClient = (
  accessToken?: string,
  url?: string,
): NDExClient => {
  let baseUrl = url ?? getNDExBaseUrl()
  if (
    baseUrl &&
    !baseUrl.startsWith('http://') &&
    !baseUrl.startsWith('https://')
  ) {
    baseUrl = `https://${baseUrl}`
  }
  const client = new NDExClient({ baseURL: baseUrl })

  if (accessToken) {
    client.updateConfig({
      auth: {
        type: 'oauth',
        idToken: accessToken,
      },
    })
  }

  return client
}
