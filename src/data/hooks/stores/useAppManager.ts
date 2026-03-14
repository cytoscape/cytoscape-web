import { useEffect, useRef, useState } from 'react'

import { CyWebApi } from '../../../app-api/core'
import type { AppContextApis } from '../../../app-api/types/AppContext'
import appConfig from '../../../assets/apps.json'
import { logApp } from '../../../debug'
import { loadModule } from '../../../features/AppManager/ExternalComponent'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
import { mountApp, unmountAllApps, unmountApp } from './appLifecycle'
import { useAppStore } from './AppStore'
logApp.info(`[AppManager]: App config file loaded: `, appConfig)

// appConfig contains reference list of available apps.
const appIds: string[] = appConfig.map((app: any) => app.name)

/**
 * Load external modules only once.
 *
 * Uses the low-level webpack container API (via loadModule) so that
 * the list of apps is driven entirely by apps.json — no hardcoded
 * import map required.
 *
 * @returns Array of successfully loaded CyApp objects
 */
const loadModules = async (): Promise<CyApp[]> => {
  if (appIds.length === 0) {
    return []
  }

  const results = await Promise.allSettled(
    appConfig.map(async (app: { name: string; url: string }) => {
      const { name, url } = app
      try {
        const module = await loadModule(name, './AppConfig', url)
        const cyApp: CyApp = (module as any).default
        if (cyApp !== undefined) {
          logApp.info(
            `[loadModules]: Successfully loaded app ${name} from ${url}`,
          )
          return cyApp
        }
        logApp.info(
          `[loadModules]: No default export found for ${name}/AppConfig`,
        )
        return undefined
      } catch (err) {
        logApp.warn(
          `[loadModules]: Failed to load remote app ${name}/AppConfig:`,
          err,
        )
        return undefined
      }
    }),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<CyApp | undefined> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value)
    .filter((app): app is CyApp => app !== undefined)
}

// This contains only active remote apps
const loadedApps = await loadModules()
const activatedAppIdSet = new Set<string>(loadedApps.map((app) => app.id))
// Fast ID-to-CyApp lookup for lifecycle calls.
// Also exported so rendering code can access fresh component lazy-loaders
// even before the store is updated (e.g., during DB restore).
export const appRegistry = new Map<string, CyApp>(
  loadedApps.map((app) => [app.id, app]),
)

export const useAppManager = (): void => {
  const initRef = useRef<boolean>(false)
  // Track failed app operations to prevent infinite retries
  const failedAppIds = useRef<Set<string>>(new Set())
  // Track last processed app state to prevent unnecessary re-runs
  const lastAppsState = useRef<string>('')
  // Track apps where mount() was successfully called
  const mountedApps = useRef<Set<string>>(new Set())
  // True once restore() has completed. The lifecycle useEffect must not run
  // before this, because apps would still be empty ({}) and every app would
  // incorrectly appear as a fresh (never-registered) registration, causing
  // mount() to be called before the persisted Inactive status is known.
  const [restored, setRestored] = useState<boolean>(false)

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)
  const restore = useAppStore((state) => state.restore)
  const setStatus = useAppStore((state) => state.setStatus)

  // Call unmount() on all mounted apps when the page is about to unload
  useEffect(() => {
    const handleUnload = (): void => {
      void unmountAllApps(appRegistry, mountedApps.current)
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  useEffect(() => {
    if (initRef.current === false) {
      restore(appIds).then(() => {
        logApp.info(
          `[${useAppManager.name}]: Apps restored from the local cache`,
        )
        // Signal that persisted app state (including Inactive status) is now
        // available in the store. The lifecycle useEffect below depends on this
        // flag so it does not fire before restore() completes.
        setRestored(true)
      })
    }

    return () => {
      logApp.info(`[${useAppManager.name}]: App Manager unmounted`)
    }
  }, [restore])

  useEffect(() => {
    // Do not process any apps until restore() has completed. Without this guard,
    // the effect fires with apps={} (empty store) and treats every app as a fresh
    // registration, calling mount() before the persisted Inactive status is known.
    if (!restored) return

    // Create a stable string representation of apps state to detect actual changes
    const currentAppsState = JSON.stringify(
      Object.keys(apps).map((id) => ({
        id,
        status: apps[id]?.status,
      })),
    )

    // Skip if state hasn't actually changed (prevents unnecessary re-runs)
    if (currentAppsState === lastAppsState.current) {
      return
    }
    lastAppsState.current = currentAppsState

    appIds.forEach((appId: string) => {
      // Skip if this app has failed before (circuit breaker pattern)
      if (failedAppIds.current.has(appId)) {
        logApp.warn(
          `[${useAppManager.name}]: Skipping ${appId} due to previous failure`,
        )
        return
      }

      try {
        if (activatedAppIdSet.has(appId)) {
          const cyApp = loadedApps.find((app) => app.id === appId) as CyApp
          if (!apps[appId]) {
            // Fresh registration — app not yet in store.
            registerApp(cyApp)
            void mountApp(
              cyApp,
              { appId: cyApp.id, apis: CyWebApi as AppContextApis },
              mountedApps.current,
            )
          } else if (
            !mountedApps.current.has(appId) &&
            apps[appId]?.status !== AppStatus.Inactive
          ) {
            // App was restored from DB (missing component lazy-loaders) but not
            // yet mounted. Re-register with the fresh module data so that
            // component.component fields (React.lazy instances) are present.
            // Skip if the user had previously disabled this app — mounting must
            // only happen when the app is explicitly enabled (status !== Inactive).
            registerApp(cyApp)
            void mountApp(
              cyApp,
              { appId: cyApp.id, apis: CyWebApi as AppContextApis },
              mountedApps.current,
            )
          } else if (
            apps[appId]?.status === AppStatus.Inactive &&
            mountedApps.current.has(appId)
          ) {
            // User disabled the app via the UI — call unmount() to clean up.
            // Must be inside the activatedAppIdSet block so cyApp is in scope.
            void unmountApp(cyApp, mountedApps.current)
          } else if (
            apps[appId]?.status === AppStatus.Active &&
            !mountedApps.current.has(appId)
          ) {
            // User re-enabled the app via the UI — call mount() again.
            void mountApp(
              cyApp,
              { appId, apis: CyWebApi as AppContextApis },
              mountedApps.current,
            )
          }
        } else if (apps[appId] && !activatedAppIdSet.has(appId)) {
          // App was registered but is no longer loadable — unmount then mark as error
          const cyApp = appRegistry.get(appId)
          if (cyApp !== undefined) {
            void unmountApp(cyApp, mountedApps.current)
          }
          setStatus(appId, AppStatus.Error)
        } else if (
          apps[appId] &&
          activatedAppIdSet.has(appId) &&
          apps[appId].status === AppStatus.Error
        ) {
          // Activate again
          setStatus(appId, AppStatus.Active)
        }
      } catch (error) {
        // Mark app as failed to prevent infinite retries
        failedAppIds.current.add(appId)
        logApp.error(
          `[${useAppManager.name}]: Error processing app ${appId}, marking as failed:`,
          error,
        )
      }
    })
    initRef.current = true
  }, [apps, registerApp, restored, setStatus])
}
