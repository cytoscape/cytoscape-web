import { AppCatalogEntry } from '../../AppModel/AppCatalogEntry'
import { AppLoadFailure } from '../../AppModel/AppLoadFailure'
import { AppLoadState, SettableAppLoadState } from '../../AppModel/AppLoadState'
import { AppStatus } from '../../AppModel/AppStatus'
import { CyApp } from '../../AppModel/CyApp'
import { AppSource } from '../../AppModel/InstalledApp'
import { ManifestSource } from '../../AppModel/ManifestSource'
import { parameterKeys } from '../../AppModel/impl/parameters'
import { ServiceApp } from '../../AppModel/ServiceApp'
import { ServiceAppTask } from '../../AppModel/ServiceAppTask'

/**
 * Return the copy of a CyApp that is safe to keep in the store: without
 * `resources`, and without the legacy `components`.
 *
 * `resources` contains React.lazy() components. React mutates those
 * internally (`_status`, `_result`), so once Immer freezes them React crashes
 * with "Cannot assign to read only property". The live `resources` array is
 * available from the original CyApp in `appRegistry` and is processed by
 * `processDeclarativeResources` in useAppManager.ts (which stores them in the
 * Immer-free AppResourceStore).
 *
 * `components` was removed in App API 1.0.0-beta.5 (#786), but the type does
 * not hold at runtime: an app built against older types still exports it,
 * lazy refs included, and an app record saved by an older host still has it.
 */
const toStoredApp = (app: CyApp): CyApp => {
  const rest = { ...(app as any) }
  delete rest.resources
  delete rest.components
  return rest
}

export interface AppState {
  apps: Record<string, CyApp>
  serviceApps: Record<string, ServiceApp>
  currentTask?: ServiceAppTask
  catalog: Record<string, AppCatalogEntry>
  catalogSources: Record<string, AppSource>
  manifestIds: string[]
  loadStates: Record<string, AppLoadState>
  loadErrors: Record<string, AppLoadFailure>
  manifestSource?: ManifestSource
}

/**
 * Seed the session apps map with the given records and restore service apps.
 *
 * Apps are seeded from `workspace.installedApps` (the durable status source,
 * §8.4), not the deprecated global `apps` IndexedDB store.
 */
export const restore = (
  state: AppState,
  apps: CyApp[],
  serviceApps: ServiceApp[],
): AppState => {
  const newApps = { ...state.apps }
  apps.forEach((app) => {
    newApps[app.id] = toStoredApp(app)
  })

  const newServiceApps = { ...state.serviceApps }
  serviceApps.forEach((serviceApp) => {
    newServiceApps[serviceApp.url] = serviceApp
  })

  return {
    ...state,
    apps: newApps,
    serviceApps: newServiceApps,
  }
}

/**
 * Add an app.
 *
 * When the app already exists in the store (e.g. after restore()), refresh
 * `version` from the live module.
 *
 * When a cachedApp from IndexedDB is provided for a brand-new registration,
 * use the cached record, so user-toggled Active/Inactive survives.
 */
export const add = (
  state: AppState,
  app: CyApp,
  cachedApp: CyApp | undefined,
): AppState => {
  // Already in store — refresh version from the live module
  if (state.apps[app.id] !== undefined) {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: {
          ...toStoredApp(state.apps[app.id]),
          version: app.version,
        },
      },
    }
  }

  // First registration: use DB cache for persisted fields (status)
  if (cachedApp !== undefined) {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: toStoredApp(cachedApp),
      },
    }
  }

  // Brand-new app with no DB history
  return {
    ...state,
    apps: {
      ...state.apps,
      [app.id]: {
        ...toStoredApp(app),
        status: app.status || AppStatus.Inactive,
      },
    },
  }
}

/**
 * Add a service app
 */
export const addService = (
  state: AppState,
  serviceApp: ServiceApp,
): AppState => {
  // Do not register the same service app multiple times
  if (state.serviceApps[serviceApp.url] !== undefined) {
    return state
  }

  return {
    ...state,
    serviceApps: {
      ...state.serviceApps,
      [serviceApp.url]: serviceApp,
    },
  }
}

/**
 * Replace an existing service app's metadata (used by refresh). Unlike
 * addService, this always overwrites the entry for the app's url.
 */
export const refreshService = (
  state: AppState,
  serviceApp: ServiceApp,
): AppState => {
  return {
    ...state,
    serviceApps: {
      ...state.serviceApps,
      [serviceApp.url]: serviceApp,
    },
  }
}

/**
 * Remove a service app
 */
export const removeService = (state: AppState, url: string): AppState => {
  const restServiceApps = { ...state.serviceApps }
  delete restServiceApps[url]
  return {
    ...state,
    serviceApps: restServiceApps,
  }
}

/**
 * Set app status
 */
export const setStatus = (
  state: AppState,
  id: string,
  status: AppStatus,
): AppState => {
  const app = state.apps[id]
  if (app === undefined) {
    return state
  }

  return {
    ...state,
    apps: {
      ...state.apps,
      [id]: {
        ...app,
        status,
      },
    },
  }
}

/**
 * Set current task
 */
export const setCurrentTask = (
  state: AppState,
  task: ServiceAppTask,
): AppState => {
  return {
    ...state,
    currentTask: task,
  }
}

/**
 * Clear current task
 */
export const clearCurrentTask = (state: AppState): AppState => {
  return {
    ...state,
    currentTask: undefined,
  }
}

/**
 * Update service parameter
 */
export const updateServiceParameter = (
  state: AppState,
  url: string,
  key: string,
  value: string,
): AppState => {
  const serviceApp = state.serviceApps[url]
  if (serviceApp === undefined) {
    return state
  }

  // Parameters are addressed by the key rule (displayName, or the group
  // path when two parameters share a displayName) — the same key the form
  // reports and the run payload is sent under.
  // Last match: when two parameters still share a key (same label, same
  // groups) the form shows and the payload sends the last one's value, so
  // an edit must land there too.
  const keys = parameterKeys(serviceApp.parameters)
  const index = keys.lastIndexOf(key)
  if (index === -1) {
    return state
  }

  const newParameters = serviceApp.parameters.map((p, i) =>
    i === index ? { ...p, value } : p,
  )

  return {
    ...state,
    serviceApps: {
      ...state.serviceApps,
      [url]: {
        ...serviceApp,
        parameters: newParameters,
      },
    },
  }
}

/**
 * Update input column
 */
export const updateInputColumn = (
  state: AppState,
  url: string,
  name: string,
  columnName: string,
): AppState => {
  const serviceApp = state.serviceApps[url]
  if (serviceApp === undefined) {
    return state
  }

  const serviceInputDefinition = serviceApp.serviceInputDefinition
  if (serviceInputDefinition === undefined) {
    return state
  }

  const inputColumn = serviceInputDefinition.inputColumns.find(
    (c) => c.name === name,
  )
  if (inputColumn === undefined) {
    return state
  }

  const newInputColumns = serviceInputDefinition.inputColumns.map((c) =>
    c.name === name ? { ...c, columnName } : c,
  )

  return {
    ...state,
    serviceApps: {
      ...state.serviceApps,
      [url]: {
        ...serviceApp,
        serviceInputDefinition: {
          ...serviceInputDefinition,
          inputColumns: newInputColumns,
        },
      },
    },
  }
}

/**
 * Replace the entire catalog with entries keyed by id, along with each
 * entry's provenance. When `sources` is omitted, every entry defaults to
 * `'manifest'`.
 *
 * `manifestIds` is the set of ids the manifest itself carries. It is kept
 * apart from `catalogSources` because a pinned install shadows the manifest
 * source tag on a collision (composeCatalog §8.1). When omitted it falls back
 * to the entries whose resolved source is `'manifest'`.
 *
 * A failure survives only while the new catalog still carries its id at the
 * same URL; a changed URL and a dropped entry both retire it, along with its
 * `'failed'` load state. Four of the five codes are not retryable, so the App
 * Manager offers no control on such a row (#719): a refreshed manifest that
 * fixes the bundle URL would otherwise leave the row dead for the session,
 * even though `ensureRemoteRegistered` re-registers a scope whose URL changed,
 * and a failure kept past a removal would resurrect on the id's return.
 * `mount-failed` carries no URL and is retryable, so it is left alone.
 */
export const setCatalog = (
  state: AppState,
  entries: AppCatalogEntry[],
  sources?: Record<string, AppSource>,
  manifestIds?: string[],
): AppState => {
  const catalog: Record<string, AppCatalogEntry> = {}
  const catalogSources: Record<string, AppSource> = {}
  for (const entry of entries) {
    catalog[entry.id] = entry
    catalogSources[entry.id] = sources?.[entry.id] ?? 'manifest'
  }

  const loadStates = { ...state.loadStates }
  const loadErrors = { ...state.loadErrors }
  for (const [id, failure] of Object.entries(state.loadErrors)) {
    const failedUrl = 'url' in failure ? failure.url : undefined
    if (failedUrl === undefined) continue
    if (catalog[id]?.url === failedUrl) continue
    delete loadErrors[id]
    delete loadStates[id]
  }

  return {
    ...state,
    catalog,
    catalogSources,
    loadStates,
    loadErrors,
    manifestIds:
      manifestIds ??
      Object.keys(catalogSources).filter(
        (id) => catalogSources[id] === 'manifest',
      ),
  }
}

/**
 * Set the runtime load state for a specific app, discarding any failure
 * recorded for it. A transition to 'loading', 'loaded' or 'unloaded' makes the
 * previous reason stale. `'failed'` is not reachable here — `setLoadFailed` is
 * the only way in, so the state and its reason are always written together.
 */
export const setLoadState = (
  state: AppState,
  id: string,
  loadState: SettableAppLoadState,
): AppState => {
  const restLoadErrors = { ...state.loadErrors }
  delete restLoadErrors[id]
  return {
    ...state,
    loadStates: {
      ...state.loadStates,
      [id]: loadState,
    },
    loadErrors: restLoadErrors,
  }
}

/**
 * Mark an app failed and record why, in one transition, so no failed app is
 * ever left without a reason.
 */
export const setLoadFailed = (
  state: AppState,
  id: string,
  failure: AppLoadFailure,
): AppState => {
  return {
    ...state,
    loadStates: {
      ...state.loadStates,
      [id]: 'failed',
    },
    loadErrors: {
      ...state.loadErrors,
      [id]: failure,
    },
  }
}

/**
 * Set or clear the manifest source
 */
export const setManifestSource = (
  state: AppState,
  source: ManifestSource | undefined,
): AppState => {
  return {
    ...state,
    manifestSource: source,
  }
}

/**
 * Remove an app from apps, loadStates and loadErrors
 */
export const removeApp = (state: AppState, id: string): AppState => {
  const restApps = { ...state.apps }
  delete restApps[id]
  const restLoadStates = { ...state.loadStates }
  delete restLoadStates[id]
  const restLoadErrors = { ...state.loadErrors }
  delete restLoadErrors[id]
  return {
    ...state,
    apps: restApps,
    loadStates: restLoadStates,
    loadErrors: restLoadErrors,
  }
}
