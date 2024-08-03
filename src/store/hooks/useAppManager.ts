import { useEffect } from 'react'
import { useAppStore } from '../AppStore'
import appConfig from '../../assets/apps.json'
import { CyApp } from '../../models/AppModel/CyApp'
import ExternalComponent, {
  loadComponent,
  loadModule,
} from '../../components/AppManager/ExternalComponent'
import { appImportMap } from '../../assets/app-definition'

console.log('[AppManager] App config loaded: ', appConfig)
// Register dynamically loaded apps to the store

const loadMod = async (moduleName: string) => {
  const importFunc = appImportMap[moduleName as keyof typeof appImportMap]
  if (importFunc) {
    return importFunc()
  }
  throw new Error(`Unknown module name: ${moduleName}`)
}

const loadAllModules = async () => {
  const moduleNames = Object.keys(appImportMap) as (keyof typeof appImportMap)[]
  const loadedModules = await Promise.all(
    moduleNames.map((moduleName) => {
      const importFunc = appImportMap[moduleName]
      if (importFunc) {
        return importFunc()
      }
      throw new Error(`Unknown module name: ${moduleName}`)
    }),
  )
  return loadedModules
}

export const useAppManager = (): void => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const registerApp = useAppStore((state) => state.add)

  useEffect(() => {
    let isMounted = true
    // const load = async () => {
    //   try {
    //     if (!isMounted) return
    //     console.log('Loading modules:', appConfig)
    //     for (let i = 0; i < appConfig.length; i++) {
    //       // const loadedModule = await loadModule(app.name, `./${app.entryPoint}`)
    //       // const appMetadata: CyApp = loadedModule[app.entryPoint]
    //       // registerApp(appMetadata)
    //       // console.log('# App module registered:', loadedModule)

    //       const name = appConfig[i].name
    //       const entryPoint = './' + appConfig[i].entryPoint
    //       const loadedModule = await loadModule(name, entryPoint)
    //       const appMetadata: CyApp = loadedModule[appConfig[i].entryPoint]
    //       registerApp(appMetadata)
    //       console.log('#@ App modules loaded:', appConfig)
    //     }
    //   } catch (err) {
    //     console.error('#########Error loading module', err)
    //   }
    // }

    // load().catch(console.error)

    const loadModules = async () => {
      console.log('App Manager initialized.')

      // Load the modules defined in the config file
      // appConfig.forEach(async (app) => {
      //   try {
      //     // const appName = app.name
      //     const entryPointName = app.entryPoint
      //     const loadedModule = await loadModule(app.name, `./${app.entryPoint}`)
      //     const appMetadata: CyApp = module[entryPointName]
      //     registerApp(appMetadata)
      //     console.log('# App module registered:', module)
      //   } catch (e) {
      //     console.error(`Error loading module ${app.name} from ${app.url}`, e)
      //   }
      // })

      // const app1 = appConfig[0]
      // const name1 = app1.name
      // const entryPoint1 = app1.entryPoint
      // console.log('STATIC IMPORTS for', entryPoint1)
      // const loadedModule = await loadModule(name1, `./${entryPoint1}`)

      // const app2 = appConfig[1]
      // const name2 = app2.name
      // const entryPoint2 = app2.entryPoint
      // console.log('STATIC IMPORTS for', entryPoint1)
      // const loadedModule2 = await loadModule('simpleMenu', `./SimpleMenuApp`)

      // const fullModulePath = `${name1}/${entryPoint1}`

      // console.log('Attempting to import:', fullModulePath)

      // const module1 = await import(fullModulePath)
      // const module1 = await import('hello/HelloApp' as any)
      // const module2 = await import('simpleMenu/SimpleMenuApp' as any)

      // const loadedModules = await Promise.all(
      //   entryPointList.map((entryPoint: string) => import(entryPoint as any)),
      // )
      // const { SimpleMenuApp } = module1
      // const { HelloApp } = module2

      // const module1 = await loadMod('hello')
      // const module2 = await loadMod('simpleMenu')
      // console.log('STATIC IMPORTS5', module1, module2)
      const loadedModules = await loadAllModules()

      console.log('LOADED ALL@@@@@', loadedModules)
      registerApp(loadedModules[0]['HelloApp'])
      registerApp(loadedModules[1]['SimpleMenuApp'])
    }

    loadModules()

    return () => {
      isMounted = false
      console.log('AppPanel unmounted')
    }
  }, [appConfig])

  useEffect(() => {
    console.log('App Store updated:', apps)
  }, [apps])
}
