import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { parseManifest } from './parseManifest'

/**
 * Fetch a manifest from a URL and return validated catalog entries.
 * On network or JSON parse error, logs a warning and returns an empty array.
 *
 * Fetched with `cache: 'no-cache'`: the deployment's apps.json is served
 * without Cache-Control, so a browser may reuse a copy heuristically, and a
 * page reload does not refetch fetch() requests. A copy from before a
 * deployment would keep loading an app version the deployment replaced, such
 * as a broken core app it fixed. The server answers 304 when nothing changed.
 */
export async function fetchManifest(url: string): Promise<AppCatalogEntry[]> {
  try {
    const response = await fetch(url, { cache: 'no-cache' })
    if (!response.ok) {
      logApp.warn(
        `[fetchManifest]: HTTP ${response.status} fetching manifest from ${url}`,
      )
      return []
    }
    const data = await response.json()
    return parseManifest(data)
  } catch (error) {
    logApp.warn(`[fetchManifest]: Failed to fetch manifest from ${url}:`, error)
    return []
  }
}
