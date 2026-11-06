import type { IdType } from '../../../models/IdType'

/**
 * NDEx access keys from share links (`?accesskey=`), by network UUID.
 *
 * A share link grants read access to a private network without a login. The
 * key arrives on a deep link, `/:workspaceId/networks/:networkId?accesskey=`,
 * but every NDEx fetch for that network happens after the URL is cleaned, so
 * the key is held here.
 *
 * Memory only, on purpose: anyone holding the key can read the network, so it
 * never reaches IndexedDB. Once the CX2 is cached, later loads need no key.
 */
const accessKeys = new Map<IdType, string>()

/** NDEx's own query param name for a share-link key, lowercase. */
export const ACCESS_KEY_QUERY_KEY = 'accesskey'

const NETWORK_PATH = /\/networks\/([^/]+)\/?$/

export const rememberNdexAccessKey = (
  networkId: IdType,
  accessKey: string,
): void => {
  accessKeys.set(networkId, accessKey)
}

/**
 * Remembers the key of a share-link deep link, if the URL is one.
 *
 * Called from bootstrap before React renders. A deep link renders
 * WorkspaceEditor at once, and its load effect fires before AppShell's boot
 * effect (children first), so any later capture loses that race and the first
 * NDEx fetch goes out without the key.
 */
export const rememberNdexAccessKeyFromUrl = (
  pathname: string,
  search: string,
): void => {
  const networkId = NETWORK_PATH.exec(pathname)?.[1]
  const accessKey = new URLSearchParams(search).get(ACCESS_KEY_QUERY_KEY)
  if (networkId !== undefined && accessKey) {
    rememberNdexAccessKey(decodeURIComponent(networkId), accessKey)
  }
}

export const getNdexAccessKey = (networkId: IdType): string | undefined =>
  accessKeys.get(networkId)

export const clearNdexAccessKeysForTesting = (): void => {
  accessKeys.clear()
}
