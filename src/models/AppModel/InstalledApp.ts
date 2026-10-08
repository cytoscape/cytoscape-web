import { AppCatalogEntry } from './AppCatalogEntry'
import { AppStatus } from './AppStatus'

/**
 * How an installed app entered the workspace.
 * - manifest: came from the manifest catalog (apps.json) and was activated
 * - appstore: installed from the App Store / Install from URL
 * - snapshot: imported from a restored workspace snapshot
 */
export type AppSource = 'manifest' | 'appstore' | 'snapshot'

/**
 * A persisted, workspace-scoped record of an installed app.
 *
 * Wraps the full catalog entry (so the immutable remoteEntry URL travels with
 * the workspace), plus activation status and provenance. This is the single
 * durable source of truth for app state; see workspace-app-install-design.md
 * §6.1.
 */
export interface InstalledApp {
  /** Full catalog entry, including the immutable versioned remoteEntry URL */
  entry: AppCatalogEntry
  /** Last known activation status (active | inactive | error) */
  status: AppStatus
  /** How this app entered the workspace */
  source: AppSource
  /** ISO timestamp of installation */
  installedAt: string
}
