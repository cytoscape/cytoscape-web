import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  deleteServiceAppFromDb,
  getAllServiceAppsFromDb,
  getAppFromDb,
  putAppToDb,
  putServiceAppToDb,
} from '../../db'
import { logStore } from '../../../debug'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceAppTask } from '../../../models/AppModel/ServiceAppTask'
import { ServiceMetadata } from '../../../models/AppModel/ServiceMetadata'
import { AppStore } from '../../../models/StoreModel/AppStoreModel'
import * as AppStoreImpl from '../../../models/StoreModel/impl/appStoreImpl'

const sampleUrl = 'https://cd.ndexbio.org/cy/cytocontainer/v1/louvain'

export const serviceFetcher = async (url: string): Promise<ServiceApp> => {
  // Fetch the service app metadata from the given URL

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch the service metadata.')
  }

  const metadata: ServiceMetadata = await response.json()
  const serviceApp: ServiceApp = {
    url,
    ...metadata,
  }

  return serviceApp
}

export const useAppStore = create(
  immer<AppStore>((set, get) => ({
    apps: {},
    serviceApps: {},
    currentTask: undefined,

    restore: async (appIds: string[]) => {
      const apps = await Promise.all(
        appIds.map(async (id) => {
          const cached = await getAppFromDb(id)
          return { id, cached }
        }),
      )

      const serviceApps = await getAllServiceAppsFromDb()

      set((state) => {
        const newState = AppStoreImpl.restore(state, apps, serviceApps)
        state.apps = newState.apps
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    add: (app: CyApp) => {
      const { id } = app
      getAppFromDb(id).then((cachedApp: CyApp) => {
        set((state) => {
          const newState = AppStoreImpl.add(state, app, cachedApp)
          if (newState.apps[id] !== state.apps[id]) {
            // App was added, persist to DB if it's a new app
            if (cachedApp === undefined) {
              putAppToDb(newState.apps[id])
            }
          }
          state.apps = newState.apps
          return state
        })
      })
    },

    addService: async (url: string) => {
      // Do not register the same service app multiple times
      if (get().serviceApps[url] !== undefined) {
        logStore.warn(
          `[${useAppStore.name}]: Service app already registered: ${url}`,
        )
        return
      }
      const serviceApp = await serviceFetcher(url)
      await putServiceAppToDb(serviceApp)

      set((state) => {
        const newState = AppStoreImpl.addService(state, serviceApp)
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    removeService: (url: string) => {
      set((state) => {
        const newState = AppStoreImpl.removeService(state, url)
        deleteServiceAppFromDb(url).catch((error) => {
          logStore.error(
            `[${useAppStore.name}]: Failed to delete service metadata from ${url}`,
            error,
          )
        })
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    setStatus: (id: string, status: AppStatus) => {
      set((state) => {
        const newState = AppStoreImpl.setStatus(state, id, status)
        state.apps = newState.apps
        const newAppState = { ...newState.apps[id] }
        if (newAppState) {
          putAppToDb(newAppState)
        }
        return state
      })
    },

    setCurrentTask: (task: ServiceAppTask) => {
      set((state) => {
        const newState = AppStoreImpl.setCurrentTask(state, task)
        state.currentTask = newState.currentTask
        return state
      })
    },

    clearCurrentTask: () => {
      set((state) => {
        const newState = AppStoreImpl.clearCurrentTask(state)
        state.currentTask = newState.currentTask
        return state
      })
    },

    updateServiceParameter(url: string, displayName: string, value: string) {
      set((state) => {
        const serviceApp = state.serviceApps[url]
        if (serviceApp === undefined) {
          throw new Error(`Service not found for URL: ${url}`)
        }

        const parameter = serviceApp.parameters.find(
          (p) => p.displayName === displayName,
        )
        if (parameter === undefined) {
          throw new Error(`Parameter not found for name: ${displayName}`)
        }

        const newState = AppStoreImpl.updateServiceParameter(
          state,
          url,
          displayName,
          value,
        )
        state.serviceApps = newState.serviceApps

        // Update the cached service app
        putServiceAppToDb({ ...newState.serviceApps[url] })
          .then(() => {
            logStore.info(
              `[${useAppStore.name}]: Target column updated for service app: ${url}`,
            )
          })
          .catch((error) => {
            logStore.error(
              `[${useAppStore.name}]: Failed to update service app`,
              error,
            )
          })
        return state
      })
    },

    updateInputColumn(url: string, name: string, columnName: string) {
      set((state) => {
        const serviceApp = state.serviceApps[url]
        if (serviceApp === undefined) {
          throw new Error(`Service not found for URL: ${url}`)
        }

        const inputColumn =
          serviceApp.serviceInputDefinition?.inputColumns.find(
            (c) => c.name === name,
          )
        if (inputColumn === undefined) {
          throw new Error(`Input column not found for name: ${name}`)
        }

        const newState = AppStoreImpl.updateInputColumn(
          state,
          url,
          name,
          columnName,
        )
        state.serviceApps = newState.serviceApps

        // Update the cached service app
        putServiceAppToDb({ ...newState.serviceApps[url] })
          .then(() => {
            logStore.info(
              `[${useAppStore.name}]: Target column updated for service app: ${url}`,
            )
          })
          .catch((error) => {
            logStore.error(
              `[${useAppStore.name}]: Failed to update service app`,
              error,
            )
          })
        return state
      })
    },
  })),
)
