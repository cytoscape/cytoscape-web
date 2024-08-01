import { useEffect } from 'react'
import { useAppStore } from '../AppStore'

// Register dynamically loaded apps to the store
export const useAppManager = (): void => {
  const registerApp = useAppStore((state) => state.add)

  useEffect(() => {
    const loadComponent = async () => {
      console.log('App Manager initialized.')
      const module1 = await import('simpleMenu/SimpleMenuApp' as any)
      const module2 = await import('hello/HelloApp' as any)

      const { SimpleMenuApp } = module1
      const { HelloApp } = module2
      registerApp(SimpleMenuApp)
      registerApp(HelloApp)
      console.log('App modules registered', SimpleMenuApp, HelloApp)
    }

    loadComponent()

    return () => {
      console.log('AppPanel unmounted')
    }
  }, [])
}
