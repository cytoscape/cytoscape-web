import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { CyApp } from '../../models/AppModel/CyApp'
import { AppStore } from '../../models/StoreModel/AppStoreModel'
import {
  deleteServiceAppFromDb,
  getAllServiceAppsFromDb,
  getAppFromDb,
  putAppToDb,
  putServiceAppToDb,
} from '../../db'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { ServiceAppTask } from '../../models/AppModel/ServiceAppTask'
import { logStore } from '../../debug'

import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { ServiceMetadata } from '../../models/AppModel/ServiceMetadata'

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
        apps.forEach(({ id, cached }) => {
          if (cached !== undefined) {
            state.apps[id] = cached
          }
        })

        serviceApps.forEach((serviceApp) => {
          state.serviceApps[serviceApp.url] = serviceApp
        })
      })
    },

    add: (app: CyApp) => {
      const { id } = app
      getAppFromDb(id).then((cachedApp: CyApp) => {
        set((state) => {
          // Add app only when it is not already present
          if (state.apps[id] === undefined) {
            // Try DB first
            if (cachedApp !== undefined) {
              state.apps[id] = cachedApp
              return
            } else {
              state.apps[id] = app
              // Will be inactive by default
              state.apps[id].status = app.status || AppStatus.Inactive
              putAppToDb(app)
            }
          }
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
        state.serviceApps[url] = serviceApp
      })
    },

    removeService: (url: string) => {
      set((state) => {
        delete state.serviceApps[url]
        deleteServiceAppFromDb(url).catch((error) => {
          logStore.error(
            `[${useAppStore.name}]: Failed to delete service metadata from ${url}`,
            error,
          )
        })
      })
    },

    setStatus: (id: string, status: AppStatus) => {
      set((state) => {
        state.apps[id].status = status
      })

      const newAppState = { ...get().apps[id] }
      putAppToDb(newAppState)
    },

    setCurrentTask: (task: ServiceAppTask) => {
      set((state) => {
        state.currentTask = task
      })
    },

    clearCurrentTask: () => {
      set((state) => {
        state.currentTask = undefined
      })
    },

    updateServiceParameter(url: string, displayName: string, value: string) {
      set((state) => {
        // Get the target service app
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

        parameter.value = value
      })

      // Update the cached service app
      putServiceAppToDb({ ...get().serviceApps[url] })
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
    },

    updateInputColumn(url: string, name: string, columnName: string) {
      set((state) => {
        // Get the target service app
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

        inputColumn.columnName = columnName
      })

      // Update the cached service app
      putServiceAppToDb({ ...get().serviceApps[url] })
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
    },
  })),
)
