import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppSource, InstalledApp } from '../../../models/AppModel/InstalledApp'

/**
 * Compose the runtime catalog from the manifest and the workspace's installed
 * apps (workspace-app-install-design.md §8.1).
 *
 * Union by `id`. On collision:
 * - the installed entry wins for `source: 'appstore' | 'snapshot'` (it pins an
 *   immutable, versioned remote URL that must not be overwritten by the
 *   manifest)
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

    // Collision: installed wins only for pinned (appstore/snapshot) sources;
    // for 'manifest' the manifest entry already in place wins.
    if (installed.source === 'appstore' || installed.source === 'snapshot') {
      entryById.set(id, installed.entry)
      sources[id] = installed.source
    }
  }

  return { entries: Array.from(entryById.values()), sources, manifestIds }
}
