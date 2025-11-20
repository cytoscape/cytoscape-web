import {
  deleteDb,
  getAllAppsFromDb,
  getAllServiceAppsFromDb,
  putAppToDb,
  putServiceAppToDb,
  putWorkspaceToDb,
  deleteServiceAppFromDb,
} from '../db'
import { logDb } from '../../debug'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel/CyApp'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { Workspace } from '../../models/WorkspaceModel'
import { serviceFetcher } from './stores/AppStore'

/**
 * Interface for a remote workspace from NDEx
 */
export interface RemoteWorkspace {
  workspaceId: string
  name: string
  networkIDs: string[]
  modificationTime: Date
  creationTime: Date
  options?: {
    currentNetwork?: string
    activeApps?: string[]
    serviceApps?: string[]
  }
}

/**
 * Service app fetcher function type
 */
export type ServiceAppFetcher = (url: string) => Promise<ServiceApp>

/**
 * Hook that provides a function to load a remote workspace into the database.
 *
 * This function:
 * - Clears the current database
 * - Writes the workspace to the database
 * - Updates app statuses based on the workspace's active apps
 * - Updates service apps (fetches metadata for new ones, removes ones not in the list)
 * - Handles errors gracefully
 * - Reloads the page after successful completion
 *
 * @param serviceFetcherFn - Optional function to fetch service app metadata from URL (defaults to serviceFetcher from AppStore)
 * @returns Function to load a workspace
 */
export const useLoadWorkspace = (
  serviceFetcherFn: ServiceAppFetcher = serviceFetcher,
) => {
  /**
   * Loads a remote workspace into the database.
   *
   * @param selectedWorkspace - The remote workspace to load
   * @param currentApps - Current apps in the app store (for status updates)
   * @param currentServiceApps - Current service apps in the app store
   */
  const loadWorkspace = async (
    selectedWorkspace: RemoteWorkspace,
    currentApps: Record<string, CyApp>,
    currentServiceApps: Record<string, ServiceApp>,
  ): Promise<void> => {
    try {
      // Step 1: Clear the database
      logDb.info('[loadWorkspace] Clearing database')
      await deleteDb()

      // Step 2: Create and write workspace to DB
      const workspace: Workspace = {
        name: selectedWorkspace.name,
        id: selectedWorkspace.workspaceId,
        currentNetworkId: selectedWorkspace.options?.currentNetwork ?? '',
        networkIds: selectedWorkspace.networkIDs,
        localModificationTime: selectedWorkspace.modificationTime,
        creationTime: selectedWorkspace.creationTime,
        networkModified: {},
        isRemote: true,
      }

      logDb.info('[loadWorkspace] Writing workspace to database', workspace)
      await putWorkspaceToDb(workspace)

      // Step 3: Update app statuses in DB
      try {
        logDb.info('[loadWorkspace] Updating app statuses')
        const activeApps = new Set(selectedWorkspace.options?.activeApps ?? [])
        const dbApps = await getAllAppsFromDb()
        const currentActiveApps = new Set(
          Object.keys(currentApps).filter(
            (key) => currentApps[key].status === AppStatus.Active,
          ),
        )

        // Update apps that exist in DB
        for (const app of dbApps) {
          const shouldBeActive = activeApps.has(app.id)
          const isCurrentlyActive = currentActiveApps.has(app.id)

          if (shouldBeActive && !isCurrentlyActive) {
            // App should be active but isn't - update in DB
            const updatedApp: CyApp = { ...app, status: AppStatus.Active }
            await putAppToDb(updatedApp)
            logDb.info(`[loadWorkspace] Activated app: ${app.id}`)
          } else if (!shouldBeActive && isCurrentlyActive) {
            // App should be inactive but is active - update in DB
            const updatedApp: CyApp = { ...app, status: AppStatus.Inactive }
            await putAppToDb(updatedApp)
            logDb.info(`[loadWorkspace] Deactivated app: ${app.id}`)
          }
        }

        // Handle apps in currentApps that aren't in DB yet
        for (const appKey of Object.keys(currentApps)) {
          if (!dbApps.find((app) => app.id === appKey)) {
            const app = currentApps[appKey]
            const shouldBeActive = activeApps.has(appKey)
            const updatedApp: CyApp = {
              ...app,
              status: shouldBeActive ? AppStatus.Active : AppStatus.Inactive,
            }
            await putAppToDb(updatedApp)
            logDb.info(`[loadWorkspace] Added app to DB: ${appKey}`)
          }
        }
      } catch (error) {
        logDb.error('[loadWorkspace] Error updating app statuses', error)
        // Continue even if app updates fail
      }

      // Step 4: Update service apps in DB
      try {
        logDb.info('[loadWorkspace] Updating service apps')
        const activeServiceAppUrls = new Set(
          selectedWorkspace.options?.serviceApps ?? [],
        )
        const dbServiceApps = await getAllServiceAppsFromDb()
        const currentServiceAppUrls = new Set(Object.keys(currentServiceApps))

        // Remove service apps that are not in the workspace's list
        for (const dbServiceApp of dbServiceApps) {
          if (!activeServiceAppUrls.has(dbServiceApp.url)) {
            await deleteServiceAppFromDb(dbServiceApp.url)
            logDb.info(
              `[loadWorkspace] Removed service app: ${dbServiceApp.url}`,
            )
          }
        }

        // Remove service apps from current store that aren't in workspace
        for (const serviceAppUrl of currentServiceAppUrls) {
          if (!activeServiceAppUrls.has(serviceAppUrl)) {
            // Already handled above if it exists in DB
            logDb.info(
              `[loadWorkspace] Service app not in workspace: ${serviceAppUrl}`,
            )
          }
        }

        // Add/fetch service apps that are in workspace but not in DB
        for (const serviceAppUrl of activeServiceAppUrls) {
          const existsInDb = dbServiceApps.some(
            (app) => app.url === serviceAppUrl,
          )
          const existsInStore = currentServiceApps[serviceAppUrl] !== undefined

          if (!existsInDb) {
            // Prefer store data over fetching if available
            if (existsInStore) {
              const serviceApp = currentServiceApps[serviceAppUrl]
              await putServiceAppToDb(serviceApp)
              logDb.info(
                `[loadWorkspace] Added service app to DB from store: ${serviceAppUrl}`,
              )
            } else {
              try {
                // Fetch metadata and write to DB
                const serviceApp = await serviceFetcherFn(serviceAppUrl)
                await putServiceAppToDb(serviceApp)
                logDb.info(
                  `[loadWorkspace] Added service app to DB: ${serviceAppUrl}`,
                )
              } catch (error) {
                logDb.error(
                  `[loadWorkspace] Failed to fetch service app metadata for ${serviceAppUrl}`,
                  error,
                )
                // Continue even if one service app fails
              }
            }
          } else if (existsInStore) {
            // Update existing service app in DB with current store data
            const serviceApp = currentServiceApps[serviceAppUrl]
            await putServiceAppToDb(serviceApp)
            logDb.info(
              `[loadWorkspace] Updated service app in DB: ${serviceAppUrl}`,
            )
          }
        }
      } catch (error) {
        logDb.error('[loadWorkspace] Error updating service apps', error)
        // Continue even if service app updates fail
      }

      logDb.info(
        '[loadWorkspace] Workspace loaded successfully, reloading page',
      )
    } catch (error) {
      logDb.error('[loadWorkspace] Failed to load workspace', error)
      throw error
    }
  }

  return loadWorkspace
}
