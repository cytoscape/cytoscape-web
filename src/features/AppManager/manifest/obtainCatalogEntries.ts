import { DEFAULT_MANIFEST_URL } from '../../../app-api/constants'
import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { ManifestSource } from '../../../models/AppModel/ManifestSource'
import { fetchManifest } from './fetchManifest'
import { parseManifest } from './parseManifest'

/**
 * Single entry point for all manifest resolution.
 * Resolves the manifest source-agnostically:
 * - undefined or { type: 'url' } → fetch from URL (default or custom)
 * - { type: 'inline' } → parse raw JSON content
 */
export async function obtainCatalogEntries(
  source: ManifestSource | undefined,
): Promise<AppCatalogEntry[]> {
  if (source === undefined || source.type === 'url') {
    const url = source?.type === 'url' ? source.url : DEFAULT_MANIFEST_URL
    return fetchManifest(url)
  }

  // Inline source
  try {
    const data = JSON.parse(source.content)
    return parseManifest(data)
  } catch (error) {
    logApp.warn('[obtainCatalogEntries]: Failed to parse inline manifest:', error)
    return []
  }
}
