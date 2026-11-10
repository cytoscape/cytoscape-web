import { NDExClient } from '@js4cytoscape/ndex-client'

import { logApi } from '../../../debug'
import { getNDExBaseUrl } from './config'

// Anchored and without quantifiers over the input, so it cannot backtrack
const HTTP_SCHEME = /^https?:\/\//i

const withScheme = (url: string): string =>
  url && !HTTP_SCHEME.test(url) ? `https://${url}` : url

const originOf = (url: string): string | undefined => {
  try {
    return new URL(withScheme(url)).origin
  } catch {
    return undefined
  }
}

/**
 * Whether a URL is on the configured NDEx host.
 *
 * Compares parsed origins, so scheme, port, letter case and trailing slashes
 * are handled by the URL parser, and a string check cannot be fooled by a
 * look-alike such as `ndexbio.org.attacker.example` or
 * `ndexbio.org@attacker.example`. A URL that cannot be parsed does not match.
 */
const isConfiguredNdexHost = (url: string): boolean => {
  const origin = originOf(url)
  return origin !== undefined && origin === originOf(getNDExBaseUrl())
}

/**
 * Creates a new NDEx client instance with the configured URL and authentication token.
 *
 * The base URL is automatically obtained from the module configuration if not provided.
 *
 * The access token is sent only to the configured NDEx host. `url` can come
 * from network data (`HCX::interactionNetworkHost`), which is untrusted, and
 * anything that received the token could act on NDEx as the user. A client for
 * another host is anonymous: public networks still load, private ones fail
 * (#936).
 *
 * @param accessToken - Optional authentication token, withheld from other hosts
 * @param url - Optional base URL (defaults to module configuration if not provided)
 * @returns Configured NDEx client instance
 */
export const getNdexClient = (
  accessToken?: string,
  url?: string,
): NDExClient => {
  const baseUrl = withScheme(url ?? getNDExBaseUrl())
  const client = new NDExClient({ baseURL: baseUrl })

  if (accessToken) {
    if (url === undefined || isConfiguredNdexHost(baseUrl)) {
      client.updateConfig({
        auth: {
          type: 'oauth',
          idToken: accessToken,
        },
      })
    } else {
      logApi.warn(
        '[getNdexClient]: Not the configured NDEx host, sending the request without the access token',
        baseUrl,
      )
    }
  }

  return client
}
