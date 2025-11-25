import { useEffect, useRef } from 'react'

import { appImportMap } from '../../../assets/app-definition'
import appConfig from '../../../assets/apps.json'
import { logApp } from '../../../debug'
import { useAppStore } from './AppStore'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { CyApp } from '../../../models/AppModel/CyApp'
logApp.info(`[AppManager]: App config file loaded: `, appConfig)

// appConfig contains reference list of available apps.
const appNameMap = new Map<string, string>()
const appIds: string[] = []

appConfig.forEach((app: any) => {
  appNameMap.set(app.name, app.entryPoint)
  appIds.push(app.name)
})

/**
 * Load external modules only once
 *
 * @returns
 */
const loadModules = async () => {
  const moduleNames = Object.keys(appImportMap) as (keyof typeof appImportMap)[]
  if (moduleNames.length === 0) {
    return []
  }
  const loadedModules = await Promise.all(
    moduleNames.map((moduleName) => {
      const importFunc: any = appImportMap[moduleName]
      if (importFunc !== undefined) {
        try {
          const externalAppModule = importFunc()
            .then((module: any) => module)
            .catch((e: any) => {
              logApp.warn(
                `[${loadModules.name}]: Error loading external module ${moduleName}:`,
                e,
              )
              // Return undefined explicitly so we can check for it later
              return undefined
            })
          return [moduleName, externalAppModule]
        } catch (e) {
          logApp.error(
            `[${loadModules.name}]: Error loading external module ${moduleName}:`,
            e,
          )
          return [moduleName, null]
        }
      }
      throw new Error(`Unknown module name: ${moduleName}`)
    }),
  )
  const loaded: CyApp[] = []
  await Promise.all(
    loadedModules.map(async (moduleEntry) => {
      const moduleName = moduleEntry[0] as string
      const module: any = await moduleEntry[1]
      const entryName: string = appNameMap.get(moduleName) ?? ''

      // Skip if module failed to load (undefined/null)
      if (!module) {
        logApp.warn(
          `[${loadModules.name}]: Module ${moduleName} failed to load, skipping entry point ${entryName}`,
        )
        return
      }

      try {
        const cyApp: CyApp = await module[entryName as string]
        if (cyApp !== undefined) {
          loaded.push(cyApp)
        } else {
          // Check cached
          logApp.info(
            `[${loadModules.name}]: Status set to error: ${entryName}`,
          )
        }
      } catch (err) {
        logApp.warn(
          `[${loadModules.name}]: Failed to load a remote app: ${entryName}`,
          err,
        )
      }
    }),
  )

  return loaded
}

// This contains only active remote apps
const loadedApps = await loadModules()
const activatedAppIdSet = new Set<string>(loadedApps.map((app) => app.id))

export const useAppManager = (): void => {
  const initRef = useRef<boolean>(false)
  // Track failed app operations to prevent infinite retries
  const failedAppIds = useRef<Set<string>>(new Set())
  // Track last processed app state to prevent unnecessary re-runs
  const lastAppsState = useRef<string>('')

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)
  const restore = useAppStore((state) => state.restore)
  const setStatus = useAppStore((state) => state.setStatus)

  useEffect(() => {
    if (initRef.current === false) {
      restore(appIds).then(() => {
        // Load remote modules after loading from cached.
        // const appsLoaded: CyApp[] = loadModules()
        logApp.info(
          `[${useAppManager.name}]: Apps restored from the local cache`,
        )
      })
    }

    return () => {
      logApp.info(`[${useAppManager.name}]: App Manager unmounted`)
    }
  }, [])

  useEffect(() => {
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
        if (!apps[appId] && activatedAppIdSet.has(appId)) {
          registerApp(loadedApps.find((app) => app.id === appId) as CyApp)
        } else if (apps[appId] && !activatedAppIdSet.has(appId)) {
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
  }, [apps, registerApp, setStatus])
}
