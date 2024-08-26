/**
 * Custom hook to generate panel component from App Store data
 */

import { useEffect, useState } from 'react'
import { useAppStore } from '../AppStore'
import { CyApp } from '../../models/AppModel/CyApp'
import { ComponentMetadata } from '../../models/AppModel/ComponentMetadata'
import ExternalComponent from '../../components/AppManager/ExternalComponent'

/**
 * Custom hook to manage the app panel
 */
export const useAppPanel = (): any[] => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  const [panelsCreated, setPanelsCreated] = useState<Set<string>>(new Set())
  const [panels, setPanels] = useState<any[]>([])

  useEffect(() => {
    console.log('App Panel updated:', apps)
    Object.keys(apps).forEach((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app
      if (components === undefined) return

      components.forEach((component: ComponentMetadata) => {
        if (
          component.type === 'panel' &&
          panelsCreated.has(component.id) === false
        ) {
          const MenuComponent: any = ExternalComponent(
            app.id,
            './' + component.id,
          )
          setPanels([...panels, MenuComponent])
          // Add this component's ID to the local state
          setPanelsCreated(new Set<string>([...panelsCreated, component.id]))
        }
      })
    })
  }, [apps])

  return panels
}
