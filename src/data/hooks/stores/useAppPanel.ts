/**
 * Custom hook to generate panel component from App Store data
 */

import { useEffect, useState } from 'react'

import { logApp } from '../../../debug'
import ExternalComponent from '../../../features/AppManager/ExternalComponent'
import { useAppStore } from './AppStore'
import { appRegistry } from './useAppManager'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import { CyApp } from '../../../models/AppModel/CyApp'

/**
 * Custom hook to manage the app panel
 */
export const useAppPanel = (): any[] => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  const [panelsCreated, setPanelsCreated] = useState<Set<string>>(new Set())
  const [panels, setPanels] = useState<any[]>([])

  useEffect(() => {
    logApp.info(`[${useAppPanel.name}]: App Panel updated:`, apps)
    Object.keys(apps).forEach((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app
      if (components === undefined) return

      components.forEach((component: ComponentMetadata) => {
        if (
          component.type === 'panel' &&
          panelsCreated.has(component.id) === false
        ) {
          // Prefer the lazy component from appRegistry (always fresh, survives
          // DB restore), then the stored one, then fall back to MF load.
          const freshComponent = appRegistry
            .get(app.id)
            ?.components?.find((c) => c.id === component.id)
          const MenuComponent: any =
            freshComponent?.component ??
            component.component ??
            ExternalComponent(app.id, './' + component.id)
          setPanels([...panels, MenuComponent])
          // Add this component's ID to the local state
          setPanelsCreated(new Set<string>([...panelsCreated, component.id]))
        }
      })
    })
  }, [apps])

  return panels
}
