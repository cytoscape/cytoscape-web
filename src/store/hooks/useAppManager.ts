import { useEffect, useRef } from 'react'
import { useAppStore } from '../AppStore'
import appConfig from '../../assets/apps.json'
import { CyApp } from '../../models/AppModel/CyApp'
import { appImportMap } from '../../assets/app-definition'
import { AppStatus } from '../../models/AppModel/AppStatus'

console.log('[AppManager] App config loaded: ', appConfig)

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
  const loadedModules = await Promise.all(
    moduleNames.map((moduleName) => {
      const importFunc = appImportMap[moduleName]
      if (importFunc) {
        try {
          const externalAppModule = importFunc()
            .then((module) => module)
            .catch((e) => {
              console.warn(`## Error loading external module ${moduleName}:`, e)
            })
          return [moduleName, externalAppModule]
        } catch (e) {
          console.error(`Error loading external module ${moduleName}:`, e)
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
      try {
        const cyApp: CyApp = await module[entryName as string]
        if (cyApp !== undefined) {
          loaded.push(cyApp)
        } else {
          // Check cached
          console.log('Status set to error', entryName)
        }
      } catch (err) {
        console.warn(`* Failed to load a remote app: ${entryName}`, err)
      }
    }),
  )

  return loaded
}

// This contains only active remote apps
const loadedApps = await loadModules()
const activatedAppIdSet = new Set<string>(loadedApps.map((app) => app.id))

console.log('### Activated remote apps:', loadedApps)

export const useAppManager = (): void => {
  const initRef = useRef<boolean>(false)

  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)
  const restore = useAppStore((state) => state.restore)
  const setStatus = useAppStore((state) => state.setStatus)

  useEffect(() => {
    if (initRef.current === false) {
      restore(appIds).then(() => {
        // Load remote modules after loading from cached.
        // const appsLoaded: CyApp[] = loadModules()
        console.log('Apps restored from the local cache')
      })
    }

    return () => {
      console.log('App Manager unmounted')
    }
  }, [])

  useEffect(() => {
    console.log('App Store updating:', apps)
    appIds.forEach((appId: string) => {
      if (!apps[appId] && activatedAppIdSet.has(appId)) {
        //
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
    })
    initRef.current = true
  }, [apps])
}
