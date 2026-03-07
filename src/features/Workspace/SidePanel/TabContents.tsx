import { ComponentType, LazyExoticComponent, Suspense } from 'react'

import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import {
  ComponentType as AppComponentType,
  CyApp,
} from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { ViewerPanel } from '../../HierarchyViewer/components'
import { TabPanel } from './TabPanel'

/**
 * Actual contents of the side panel
 *
 * @returns {JSX.Element[]} An array of Tab panels
 */

export const getTabContents = (selectedIndex: number): JSX.Element[] => {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)

  const getPanelComponents = (): [string, any][] => {
    const panels: [string, any][] = []
    Object.keys(apps).forEach((appId: string) => {
      const app: CyApp = apps[appId]
      const { components } = app
      if (components === undefined) return

      components.forEach((component: ComponentMetadata) => {
        if (
          component.type === AppComponentType.Panel &&
          app.status === AppStatus.Active
        ) {
          // Prefer the lazy component from appRegistry (always fresh, survives
          // DB restore), then the one stored in the app record, then fall back
          // to a live Module Federation container.get() call (legacy behaviour).
          const freshComponent = appRegistry
            .get(app.id)
            ?.components?.find((c) => c.id === component.id)
          const PanelComponent: any =
            freshComponent?.component ??
            component.component ??
            ExternalComponent(app.id, './' + component.id)
          panels.push([component.id, PanelComponent])
        }
      })
    })

    return panels
  }

  const getPanels = () => {
    return getPanelComponents().map(
      (
        entry: [string, LazyExoticComponent<ComponentType<any>>],
        index: number,
      ) => {
        const key: number = index + 1
        const title: string = entry[0]
        const AppPanel = entry[1]
        return (
          <TabPanel label={title} key={key} index={key} value={selectedIndex}>
            <Suspense>
              <AppPanel />
            </Suspense>
          </TabPanel>
        )
      },
    )
  }

  return [
    <TabPanel
      label="Sub Network Viewer"
      key={0}
      index={0}
      value={selectedIndex}
    >
      <ViewerPanel />
    </TabPanel>,
    ...getPanels(),
  ]
}
