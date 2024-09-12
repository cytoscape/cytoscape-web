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

  const getPanelComponents = () => {
    const panels: any = []
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
          panels.push(PanelComponent)
        }
      })
    })

    return panels
  }
  const getPanels = () => {
    return getPanelComponents().map(
      (AppPanel: LazyExoticComponent<ComponentType<any>>, index: number) => {
        const key: number = index + 1
        return (
          <TabPanel
            label={`App ${index}`}
            key={key}
            index={key}
            value={selectedIndex}
          >
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
    // <TabPanel label="Apps" key={1} index={1} value={selectedIndex}>
    //   <AppPanel />
    // </TabPanel>,
  ]
}
