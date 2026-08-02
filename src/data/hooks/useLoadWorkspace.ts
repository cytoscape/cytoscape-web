import { logApp, logDb } from '../../debug'
import {
  isAllowedOrigin,
  isHostCompatible,
} from '../../features/AppManager/install/installGate'
import { parseManifest } from '../../features/AppManager/manifest/parseManifest'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { CyApp } from '../../models/AppModel/CyApp'
import { InstalledApp } from '../../models/AppModel/InstalledApp'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { Workspace } from '../../models/WorkspaceModel'
import {
  deleteDb,
  type DeleteDbOutcome,
  deleteServiceAppFromDb,
  getAllAppsFromDb,
  getAllServiceAppsFromDb,
  putAppToDb,
  putServiceAppToDb,
  putWorkspaceToDb,
} from '../db'
import { announceDatabaseReset } from '../db/lifecycle'
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
    installedApps?: InstalledApp[]
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
    allowedOrigins: string[] = [],
  ): Promise<void> => {
    try {
      // Step 1: Clear the database
      logDb.info('[loadWorkspace] Clearing database')
      // Same handshake resetWorkspace uses: other tabs hold this database open,
      // and IndexedDB will not delete one with live connections. Without it an
      // import with a second tab open reliably returns 'delete-blocked' and
      // fails below.
      const releasePeers = await announceDatabaseReset()
      let outcome: DeleteDbOutcome
      try {
        outcome = await deleteDb()
      } finally {
        // Peers have already closed and are waiting; release them either way so
        // they reload instead of stalling until their own timeout.
        releasePeers()
      }
      if (outcome !== 'deleted') {
        // Writing the imported workspace now would either land in a database
        // whose delete is still queued (it would be destroyed underneath us) or
        // fail row by row against a connection that never reopened. The outer
        // catch rethrows, so the caller reports the failure.
        throw new Error(
          `Cannot import a workspace: the local database was not cleared (${outcome})`,
        )
      }

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

      // Step 2b: Restore installed apps from the snapshot (§11.1, §11.3). Each
      // entry passes the §9 gate; allow-listed (and host-compatible) entries
      // keep their saved status, others import inactive. Invalid entries are
      // skipped. New snapshots carry this, so the legacy Step 3 path below is
      // taken only for older workspaces.
      const remoteInstalledApps = selectedWorkspace.options?.installedApps
      if (remoteInstalledApps !== undefined) {
        const restored: InstalledApp[] = []
        for (const app of remoteInstalledApps) {
          const validated = parseManifest([app?.entry])
          if (validated.length === 0) {
            logApp.warn(
              '[loadWorkspace] Skipping invalid installed app entry',
              app?.entry,
            )
            continue
          }
          const entry = validated[0]
          const allowed = isAllowedOrigin(entry.url, allowedOrigins)
          const compatible = isHostCompatible(entry.compatibleHostVersions)
          const keepActive =
            allowed && compatible && app.status === AppStatus.Active
          if (!allowed) {
            logApp.warn(
              `[loadWorkspace] "${entry.id}" origin is not allow-listed; imported inactive`,
            )
          } else if (!compatible && app.status === AppStatus.Active) {
            logApp.warn(
              `[loadWorkspace] "${entry.id}" is incompatible with this host; imported inactive`,
            )
          }
          restored.push({
            entry,
            status: keepActive ? AppStatus.Active : AppStatus.Inactive,
            source: 'snapshot',
            installedAt: app.installedAt ?? new Date().toISOString(),
          })
        }
        workspace.installedApps = restored
      }

      logDb.info('[loadWorkspace] Writing workspace to database', workspace)
      await putWorkspaceToDb(workspace)

      // Step 3: Legacy app-status path — only for older workspaces with no
      // options.installedApps. New snapshots already wrote workspace.installedApps
      // above; the legacy activeApps → putAppToDb behavior is kept for backward
      // compatibility and is folded into installedApps by the startup migration
      // (§10.1).
      if (remoteInstalledApps === undefined) {
        try {
          logDb.info('[loadWorkspace] Updating app statuses')
          const activeApps = new Set(
            selectedWorkspace.options?.activeApps ?? [],
          )
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
              try {
                const updatedApp: CyApp = { ...app, status: AppStatus.Active }
                await putAppToDb(updatedApp)
                logDb.info(`[loadWorkspace] Activated app: ${app.id}`)
              } catch (error) {
                logDb.error(
                  `[loadWorkspace] Failed to activate app ${app.id}:`,
                  error,
                )
                // Continue with other apps even if one fails
              }
            } else if (!shouldBeActive && isCurrentlyActive) {
              // App should be inactive but is active - update in DB
              try {
                const updatedApp: CyApp = { ...app, status: AppStatus.Inactive }
                await putAppToDb(updatedApp)
                logDb.info(`[loadWorkspace] Deactivated app: ${app.id}`)
              } catch (error) {
                logDb.error(
                  `[loadWorkspace] Failed to deactivate app ${app.id}:`,
                  error,
                )
                // Continue with other apps even if one fails
              }
            }
          }

          // Handle apps in currentApps that aren't in DB yet
          for (const appKey of Object.keys(currentApps)) {
            if (!dbApps.find((app) => app.id === appKey)) {
              try {
                const app = currentApps[appKey]
                const shouldBeActive = activeApps.has(appKey)
                const updatedApp: CyApp = {
                  ...app,
                  status: shouldBeActive
                    ? AppStatus.Active
                    : AppStatus.Inactive,
                }
                await putAppToDb(updatedApp)
                logDb.info(`[loadWorkspace] Added app to DB: ${appKey}`)
              } catch (error) {
                logDb.error(
                  `[loadWorkspace] Failed to add app ${appKey} to DB:`,
                  error,
                )
                // Continue with other apps even if one fails
              }
            }
          }
        } catch (error) {
          logDb.error('[loadWorkspace] Error updating app statuses', error)
          // Continue even if app updates fail
        }
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
