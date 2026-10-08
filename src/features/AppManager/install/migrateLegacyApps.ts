import { deleteAppFromDb, getAllAppsFromDb } from '../../../data/db'
import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { InstalledApp } from '../../../models/AppModel/InstalledApp'

export interface MigrateLegacyAppsParams {
  /** Merged catalog (manifest ∪ installedApps) used to resolve legacy URLs */
  catalog: Record<string, AppCatalogEntry>
  /** Ids already present in workspace.installedApps (skipped, then cleaned up) */
  installedAppIds: Set<string>
  /** WorkspaceStore action that adds a migrated record */
  addInstalledApp: (app: InstalledApp) => void
}

/**
 * One-time runtime migration of the legacy global `apps` IndexedDB store into
 * the current workspace's `installedApps` (workspace-app-install-design.md
 * §10.1).
 *
 * A Dexie upgrade transaction cannot await `fetch`, so URL recovery from the
 * manifest is impossible there; instead this runs at startup after the catalog
 * is composed and the workspace is hydrated, but before the auto-load pass.
 * Idempotent: it no-ops once the legacy store is empty (e.g. after the first
 * migration deletes every record).
 *
 * Per legacy record:
 * - already in `installedApps` → delete the redundant legacy record only
 * - URL resolvable from the catalog → add as `source: 'manifest'`, then delete
 * - URL not resolvable → drop (delete only); it already depended on the
 *   manifest for its URL, so nothing recoverable is lost
 */
export async function migrateLegacyApps({
  catalog,
  installedAppIds,
  addInstalledApp,
}: MigrateLegacyAppsParams): Promise<void> {
  const legacyApps = await getAllAppsFromDb()
  if (legacyApps.length === 0) return

  const now = new Date().toISOString()
  let migrated = 0
  let dropped = 0

  for (const app of legacyApps) {
    const { id } = app

    if (installedAppIds.has(id)) {
      // Already represented in installedApps — remove the redundant record
      await deleteAppFromDb(id)
      continue
    }

    const entry = catalog[id]
    if (entry === undefined) {
      // No resolvable URL — cannot migrate; drop it
      await deleteAppFromDb(id)
      dropped++
      continue
    }

    addInstalledApp({
      entry,
      status: app.status ?? AppStatus.Inactive,
      source: 'manifest',
      installedAt: now,
    })
    await deleteAppFromDb(id)
    migrated++
  }

  logApp.info(
    `[migrateLegacyApps]: migrated ${migrated} legacy app(s) into the workspace, dropped ${dropped} without a resolvable URL`,
  )
}
