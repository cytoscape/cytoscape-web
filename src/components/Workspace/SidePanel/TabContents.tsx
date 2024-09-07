import { ViewerPanel } from '../../../features/HierarchyViewer/components'
import { TabPanel } from './TabPanel'
import { ComponentType, LazyExoticComponent, Suspense } from 'react'
import { useAppStore } from '../../../store/AppStore'
import {
  CyApp,
  ComponentType as AppComponentType,
} from '../../../models/AppModel'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import ExternalComponent from '../../../components/AppManager/ExternalComponent'

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
        if (component.type === AppComponentType.Panel) {
          const PanelComponent: any = ExternalComponent(
            app.id,
            './' + component.id,
          )
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
