import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { parseManifest } from './parseManifest'

/**
 * Fetch a manifest from a URL and return validated catalog entries.
 * On network or JSON parse error, logs a warning and returns an empty array.
 */
export async function fetchManifest(url: string): Promise<AppCatalogEntry[]> {
  try {
    const response = await fetch(url)
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
