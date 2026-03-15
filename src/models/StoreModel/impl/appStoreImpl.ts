import { AppStatus } from '../../AppModel/AppStatus'
import { ComponentMetadata } from '../../AppModel/ComponentMetadata'
import { CyApp } from '../../AppModel/CyApp'
import { ServiceApp } from '../../AppModel/ServiceApp'
import { ServiceAppTask } from '../../AppModel/ServiceAppTask'

/**
 * Return a copy of the components array with the `component` field
 * (React.lazy instance) removed.  React.lazy objects are plain JS objects
 * that React mutates internally (`_status`, `_result`).  If they end up
 * inside an Immer-managed state tree, Immer will `Object.freeze()` them
 * and React will crash with "Cannot assign to read only property".
 *
 * The live React.lazy refs remain available in `appRegistry` (the
 * module-level Map exported from useAppManager.ts) and are looked up at
 * render time by AppMenu and TabContents.
 */
const stripLazyRefs = (
  components: ComponentMetadata[],
): ComponentMetadata[] => {
  if (components === undefined || components === null) {
    return []
  }
  return components.map(({ component: _lazy, ...rest }) => rest)
}

export interface AppState {
  apps: Record<string, CyApp>
  serviceApps: Record<string, ServiceApp>
  currentTask?: ServiceAppTask
}

/**
 * Restore apps from database
 */
export const restore = (
  state: AppState,
  apps: Array<{ id: string; cached: CyApp | undefined }>,
  serviceApps: ServiceApp[],
): AppState => {
  const newApps = { ...state.apps }
  apps.forEach(({ id, cached }) => {
    if (cached !== undefined) {
      newApps[id] = cached
    }
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
 * `components` and `version` from the live module.  DB-restored entries lose
 * React.lazy refs (stripped by toPlainObject) and may be missing components
 * that were added since the last persist.
 *
 * When a cachedApp from IndexedDB is provided for a brand-new registration,
 * use the cached status (so user-toggled Active/Inactive survives) but still
 * take `components` from the freshly loaded module for the same reasons.
 */
export const add = (
  state: AppState,
  app: CyApp,
  cachedApp: CyApp | undefined,
): AppState => {
  // Strip React.lazy refs so Immer never freezes them
  const safeComponents = stripLazyRefs(app.components ?? [])

  // Already in store — refresh components & version from the live module
  if (state.apps[app.id] !== undefined) {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: {
          ...state.apps[app.id],
          components: safeComponents,
          version: app.version,
        },
      },
    }
  }

  // First registration: use DB cache for persisted fields (status) but
  // always take components from the fresh module
  if (cachedApp !== undefined) {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: {
          ...cachedApp,
          components: safeComponents,
        },
      },
    }
  }

  // Brand-new app with no DB history
  return {
    ...state,
    apps: {
      ...state.apps,
      [app.id]: {
        ...app,
        components: safeComponents,
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
 * Remove a service app
 */
export const removeService = (state: AppState, url: string): AppState => {
  const { [url]: deleted, ...restServiceApps } = state.serviceApps
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
  displayName: string,
  value: string,
): AppState => {
  const serviceApp = state.serviceApps[url]
  if (serviceApp === undefined) {
    return state
  }

  const parameter = serviceApp.parameters.find(
    (p) => p.displayName === displayName,
  )
  if (parameter === undefined) {
    return state
  }

  const newParameters = serviceApp.parameters.map((p) =>
    p.displayName === displayName ? { ...p, value } : p,
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
