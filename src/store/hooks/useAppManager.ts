import { useEffect } from 'react'
import { useAppStore } from '../AppStore'
import appConfig from '../../assets/apps.json'
import { CyApp } from '../../models/AppModel/CyApp'
import { appImportMap } from '../../assets/app-definition'

console.log('[AppManager] App config loaded: ', appConfig)
const appNameMap = new Map<string, string>()
appConfig.forEach((app: any) => {
  appNameMap.set(app.name, app.entryPoint)
})

export const useAppManager = (): void => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)

  useEffect(() => {
    const loadModules = async () => {
      const moduleNames = Object.keys(
        appImportMap,
      ) as (keyof typeof appImportMap)[]
      const loadedModules = await Promise.all(
        moduleNames.map((moduleName) => {
          const importFunc = appImportMap[moduleName]
          if (importFunc) {
            return [moduleName, importFunc()]
          }
          throw new Error(`Unknown module name: ${moduleName}`)
        }),
      )
      loadedModules.forEach(async (moduleEntry) => {
        const moduleName = moduleEntry[0] as string
        const module: any = await moduleEntry[1]
        const entryName = appNameMap.get(moduleName)
        const cyApp: CyApp = await module[entryName as string]
        if (cyApp !== undefined) {
          registerApp(cyApp)
        }
      })
    }

    loadModules()

    return () => {
      console.log('App Manager unmounted')
    }
  }, [])

  useEffect(() => {
    // console.log('App Store updated:', apps)
  }, [apps])
}