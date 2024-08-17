import { useEffect } from 'react'
import { useAppStore } from '../AppStore'
import appConfig from '../../assets/apps.json'
import { CyApp } from '../../models/AppModel/CyApp'
import { appImportMap } from '../../assets/app-definition'

console.log('[AppManager] App config loaded: ', appConfig)

// appConfig contains reference list of available apps.
const appNameMap = new Map<string, string>()
const appNames: string[] = []

appConfig.forEach((app: any) => {
  appNameMap.set(app.name, app.entryPoint)
  appNames.push(app.name)
})

export const useAppManager = (): void => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)
  const restore = useAppStore((state) => state.restore)
  const setStatus = useAppStore((state) => state.setStatus)

  useEffect(() => {
    const loadModules = async () => {
      const moduleNames = Object.keys(
        appImportMap,
      ) as (keyof typeof appImportMap)[]
      const loadedModules = await Promise.all(
        moduleNames.map((moduleName) => {
          const importFunc = appImportMap[moduleName]
          if (importFunc) {
            try {
              const externalAppModule = importFunc()
                .then((module) => module)
                .catch((e) => {
                  console.warn(
                    `## Error loading external module ${moduleName}:`,
                    e,
                  )
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
      loadedModules.forEach(async (moduleEntry) => {
        const moduleName = moduleEntry[0] as string
        const module: any = await moduleEntry[1]
        const entryName = appNameMap.get(moduleName)
        try {
          const cyApp: CyApp = await module[entryName as string]
          if (cyApp !== undefined) {
            registerApp(cyApp)
          }
        } catch (err) {
          console.warn(`* Failed to load a remote app: ${entryName}`, err)
          const cachedApp = apps[entryName as string]
          if (cachedApp) {
            // set status to error
            setStatus(entryName as string, 'error')
          } else {
            // register dummy app name
          }
        }
      })
    }

    restore(appNames).then(() => {
      // Load remote modules after loading from cached.
      loadModules()
    })

    return () => {
      console.log('App Manager unmounted')
    }
  }, [])

  useEffect(() => {
    // console.log('App Store updated:', apps)
  }, [apps])
}
