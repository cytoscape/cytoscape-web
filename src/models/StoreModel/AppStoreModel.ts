import { AppCatalogEntry } from '../AppModel/AppCatalogEntry'
import { AppLoadState } from '../AppModel/AppLoadState'
import { AppStatus } from '../AppModel/AppStatus'
import { CyApp } from '../AppModel/CyApp'
import { AppSource } from '../AppModel/InstalledApp'
import { ManifestSource } from '../AppModel/ManifestSource'
import { ServiceApp } from '../AppModel/ServiceApp'
import { ServiceAppTask } from '../AppModel/ServiceAppTask'

export interface AppState {
  apps: Record<string, CyApp>

  // URL of the service endpoint is the key
  serviceApps: Record<string, ServiceApp>

  // Status of the remote task
  currentTask?: ServiceAppTask

  // Merged app catalog (manifest ∪ workspace.installedApps), session-local
  catalog: Record<string, AppCatalogEntry>

  // Provenance of each merged catalog entry (manifest | appstore | snapshot),
  // session-local; records which entry won the merge, not whether the manifest
  // still ships the app
  catalogSources: Record<string, AppSource>

  // Ids the resolved manifest carries, independent of which entry won the
  // merge; consumed by the App Manager UI to decide removability (§12.3)
  manifestIds: string[]

  // Per-app runtime load state (session-local, not persisted)
  loadStates: Record<string, AppLoadState>

  // User-configured manifest source (persisted to appSettings IndexedDB)
  manifestSource?: ManifestSource
}

export interface AppAction {
  /**
   * Seed the session apps map with the given records (built by the caller from
   * workspace.installedApps, §8.4) and restore service apps from IndexedDB.
   */
  restore: (apps: CyApp[]) => Promise<void>

  /**
   * Add an app from the external module
   *
   * @param app
   * @returns
   */
  add: (app: CyApp) => Promise<void>

  /**
   * Fetch service metadata and add it to the store
   *
   * @param url - ServiceApp endpoint to be added
   */
  addService: (url: string) => Promise<void>

  /**
   * Remove an app from the store
   *
   * @param id
   * @returns
   */
  removeService: (url: string) => void

  /**
   * Re-fetch the metadata for an already-registered service app and replace it
   * in the store, so UI/parameter changes made on the service are picked up
   * without removing and re-adding the app.
   *
   * @param url - ServiceApp endpoint to refresh
   */
  refreshService: (url: string) => Promise<void>

  /**
   * Re-fetch the metadata for every registered service app. Individual
   * failures are logged and do not abort the others.
   */
  refreshAllServices: () => Promise<void>

  /**
   * Set current status of the app
   *
   * @param id
   * @param status
   * @returns
   */
  setStatus: (id: string, status: AppStatus) => void

  /**
   * Set current task of the app
   *
   * @param task
   * @returns
   */
  setCurrentTask: (task: ServiceAppTask) => void

  /**
   * Clear current task
   *
   * @returns
   */
  clearCurrentTask: () => void

  /**
   * Update the parameters for the service call
   *
   */
  updateServiceParameter: (
    url: string,
    displayName: string,
    value: string,
  ) => void

  /**
   * Update the input column (selected column in the table)
   * name for the service call
   *
   * @param url - Service App ID
   * @param name - Input column name (key)
   * @param columnName - New column name to be used in the service call
   *
   */
  updateInputColumn: (url: string, name: string, columnName: string) => void

  /**
   * Replace the entire catalog with new entries plus their provenance.
   * When `sources` is omitted, every entry defaults to `'manifest'`.
   * When `manifestIds` is omitted, it falls back to the entries whose
   * resolved source is `'manifest'`.
   */
  setCatalog: (
    entries: AppCatalogEntry[],
    sources?: Record<string, AppSource>,
    manifestIds?: string[],
  ) => void

  /**
   * Set the runtime load state for a specific app
   */
  setLoadState: (id: string, state: AppLoadState) => void

  /**
   * Set or clear the manifest source (persisted to IndexedDB appSettings)
   */
  setManifestSource: (source: ManifestSource | undefined) => void

  /**
   * Remove an app completely: delete from apps, loadStates, and IndexedDB
   */
  remove: (id: string) => void
}

export type AppStore = AppState & AppAction
