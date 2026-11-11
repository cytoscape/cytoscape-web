import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { compareAppVersions } from '../../../models/AppModel/impl/appVersion'
import { AppSource, InstalledApp } from '../../../models/AppModel/InstalledApp'

/**
 * Compose the runtime catalog from the manifest and the workspace's installed
 * apps (workspace-app-install-design.md §8.1).
 *
 * Union by `id`. On collision:
 * - for `source: 'appstore' | 'snapshot'` the newer version wins, compared as
 *   semver: an App Store install newer than the manifest's entry replaces it,
 *   and a manifest entry newer than the install replaces the install. Equal
 *   versions keep the manifest entry. When either version is missing or not
 *   semver the install wins, pinning its immutable URL as before (§7.5)
 * - the manifest entry wins for `source: 'manifest'` (the manifest is
 *   authoritative for manifest-sourced apps)
 *
 * Manifest-only ids are tagged `'manifest'` in the sources map.
 *
 * `manifestIds` records which ids the manifest itself carries, independent of
 * which entry won the collision. A pinned install shadows the manifest source
 * tag, so `sources` alone cannot answer "does the manifest still ship this
 * app?" — which is what removability turns on (§12.3).
 *
 * @returns the merged entries, a parallel `sources` map keyed by id, and the
 * ids present in the manifest.
 */
export function composeCatalog(
  manifestEntries: AppCatalogEntry[],
  installedApps: InstalledApp[] = [],
): {
  entries: AppCatalogEntry[]
  sources: Record<string, AppSource>
  manifestIds: string[]
} {
  const entryById = new Map<string, AppCatalogEntry>()
  const sources: Record<string, AppSource> = {}

  // Seed with the manifest (every manifest entry is tagged 'manifest')
  for (const entry of manifestEntries) {
    entryById.set(entry.id, entry)
    sources[entry.id] = 'manifest'
  }

  const manifestIds = Array.from(entryById.keys())

  // Overlay the workspace's installed apps
  for (const installed of installedApps) {
    const { id } = installed.entry
    const inManifest = entryById.has(id)

    if (!inManifest) {
      // Installed-only: take the installed entry and its source
      entryById.set(id, installed.entry)
      sources[id] = installed.source
      continue
    }

    // Collision. A 'manifest' record only mirrors the manifest, so the
    // manifest entry already in place wins. An appstore/snapshot install
    // competes by version: the newer one wins, a tie keeps the manifest's, and
    // an install whose version cannot be compared stays pinned.
    if (installed.source === 'appstore' || installed.source === 'snapshot') {
      const order = compareAppVersions(
        installed.entry.version,
        entryById.get(id)?.version,
      )
      if (order === undefined || order > 0) {
        entryById.set(id, installed.entry)
        sources[id] = installed.source
      }
    }
  }

  return { entries: Array.from(entryById.values()), sources, manifestIds }
}
