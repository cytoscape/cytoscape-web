import { AppStatus } from '../../AppModel/AppStatus'
import { CyApp } from '../../AppModel/CyApp'
import { ServiceApp } from '../../AppModel/ServiceApp'
import { ServiceAppTask } from '../../AppModel/ServiceAppTask'

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
 * Add an app
 */
export const add = (
  state: AppState,
  app: CyApp,
  cachedApp: CyApp | undefined,
): AppState => {
  // Add app only when it is not already present
  if (state.apps[app.id] !== undefined) {
    return state
  }

  // Try DB first
  if (cachedApp !== undefined) {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: cachedApp,
      },
    }
  } else {
    return {
      ...state,
      apps: {
        ...state.apps,
        [app.id]: {
          ...app,
          status: app.status || AppStatus.Inactive,
        },
      },
    }
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
export const removeService = (
  state: AppState,
  url: string,
): AppState => {
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

