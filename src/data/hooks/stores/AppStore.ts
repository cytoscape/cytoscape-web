import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppLoadState } from '../../../models/AppModel/AppLoadState'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { AppSource } from '../../../models/AppModel/InstalledApp'
import { ManifestSource } from '../../../models/AppModel/ManifestSource'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { ServiceAppTask } from '../../../models/AppModel/ServiceAppTask'
import { parseServiceMetadata } from '../../../models/AppModel/serviceMetadataSchema'
import { AppStore } from '../../../models/StoreModel/AppStoreModel'
import * as AppStoreImpl from '../../../models/StoreModel/impl/appStoreImpl'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { resolveRootMenu } from '../../../models/AppModel/impl/menuRouting'
import {
  deleteAppFromDb,
  deleteAppSettingFromDb,
  deleteServiceAppFromDb,
  getAllServiceAppsFromDb,
  getAppFromDb,
  putAppSettingToDb,
  putServiceAppToDb,
} from '../../db'
import { trackWrite } from './trackWrite'

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

  // The endpoint is user-supplied, so the payload is external input: validate it
  // rather than casting. Without this, a malformed response registers as a
  // service app and fails later, deep in the menu or the input dialog.
  const metadata = parseServiceMetadata(await response.json())
  if (metadata === undefined) {
    throw new Error('The response is not valid service app metadata.')
  }

  const serviceApp: ServiceApp = {
    url,
    ...metadata,
  }

  const { root } = resolveRootMenu(serviceApp.cyWebMenuItem?.root)
  if (root === RootMenu.Layout) {
    const actions = serviceApp.cyWebActions || []
    if (actions.some((action) => action !== 'updateLayouts')) {
      throw new Error(
        `Service apps under the Layout menu may only declare the "updateLayouts" action.`,
      )
    }
  }

  return serviceApp
}

export const useAppStore = create(
  immer<AppStore>((set, get) => ({
    apps: {},
    serviceApps: {},
    currentTask: undefined,
    catalog: {},
    catalogSources: {},
    loadStates: {},
    manifestSource: undefined,

    restore: async (apps: CyApp[]) => {
      // apps are seeded by the caller from workspace.installedApps (the durable
      // status source, §8.4); only serviceApps are still restored from the DB.
      const serviceApps = await getAllServiceAppsFromDb()

      set((state) => {
        const newState = AppStoreImpl.restore(state, apps, serviceApps)
        state.apps = newState.apps
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    add: async (app: CyApp) => {
      const { id } = app
      const cachedApp = await getAppFromDb(id)
      // No persistence: the durable record is workspace.installedApps (§6.3).
      // apps/CyApp are session-local; cachedApp resolves to undefined once the
      // legacy table is migrated/empty.
      set((state) => {
        const newState = AppStoreImpl.add(state, app, cachedApp)
        state.apps = newState.apps
        return state
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
      await trackWrite(putServiceAppToDb(serviceApp))

      set((state) => {
        const newState = AppStoreImpl.addService(state, serviceApp)
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    removeService: (url: string) => {
      set((state) => {
        const newState = AppStoreImpl.removeService(state, url)
        trackWrite(deleteServiceAppFromDb(url)).catch((error) => {
          logStore.error(
            `[${useAppStore.name}]: Failed to delete service metadata from ${url}`,
            error,
          )
        })
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    refreshService: async (url: string) => {
      if (get().serviceApps[url] === undefined) {
        logStore.warn(
          `[${useAppStore.name}]: Cannot refresh unregistered service app: ${url}`,
        )
        return
      }
      const serviceApp = await serviceFetcher(url)
      await trackWrite(putServiceAppToDb(serviceApp))

      set((state) => {
        const newState = AppStoreImpl.refreshService(state, serviceApp)
        state.serviceApps = newState.serviceApps
        return state
      })
    },

    refreshAllServices: async () => {
      const urls = Object.keys(get().serviceApps)
      await Promise.all(
        urls.map(async (url) => {
          try {
            const serviceApp = await serviceFetcher(url)
            await trackWrite(putServiceAppToDb(serviceApp))
            set((state) => {
              const newState = AppStoreImpl.refreshService(state, serviceApp)
              state.serviceApps = newState.serviceApps
              return state
            })
          } catch (error) {
            logStore.error(
              `[${useAppStore.name}]: Failed to refresh service app: ${url}`,
              error,
            )
          }
        }),
      )
    },

    setStatus: (id: string, status: AppStatus) => {
      // Session-only: the durable status lives in workspace.installedApps and
      // is reconciled by useAppManager (§8.4). No write to the global apps DB.
      set((state) => {
        const newState = AppStoreImpl.setStatus(state, id, status)
        state.apps = newState.apps
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
        trackWrite(putServiceAppToDb({ ...newState.serviceApps[url] }))
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
        trackWrite(putServiceAppToDb({ ...newState.serviceApps[url] }))
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

    setCatalog: (
      entries: AppCatalogEntry[],
      sources?: Record<string, AppSource>,
    ) => {
      set((state) => {
        const newState = AppStoreImpl.setCatalog(state, entries, sources)
        state.catalog = newState.catalog
        state.catalogSources = newState.catalogSources
        return state
      })
    },

    setLoadState: (id: string, loadState: AppLoadState) => {
      set((state) => {
        const newState = AppStoreImpl.setLoadState(state, id, loadState)
        state.loadStates = newState.loadStates
        return state
      })
    },

    setManifestSource: (source: ManifestSource | undefined) => {
      set((state) => {
        const newState = AppStoreImpl.setManifestSource(state, source)
        state.manifestSource = newState.manifestSource
        return state
      })
      // Persist to IndexedDB
      if (source !== undefined) {
        trackWrite(putAppSettingToDb('manifestSource', source)).catch(
          (error) => {
            logStore.error(
              `[${useAppStore.name}]:[setManifestSource] Failed to persist:`,
              error,
            )
          },
        )
      } else {
        trackWrite(deleteAppSettingFromDb('manifestSource')).catch((error) => {
          logStore.error(
            `[${useAppStore.name}]:[setManifestSource] Failed to delete:`,
            error,
          )
        })
      }
    },

    remove: (id: string) => {
      set((state) => {
        const newState = AppStoreImpl.removeApp(state, id)
        state.apps = newState.apps
        state.loadStates = newState.loadStates
        return state
      })
      trackWrite(deleteAppFromDb(id)).catch((error) => {
        logStore.error(
          `[${useAppStore.name}]:[remove] Failed to delete app ${id} from DB:`,
          error,
        )
      })
    },
  })),
)
