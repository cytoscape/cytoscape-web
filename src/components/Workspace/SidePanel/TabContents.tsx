import { AppPanel } from '../../AppManager/AppPanel'
import { ViewerPanel } from '../../../features/HierarchyViewer/components'
import { TabPanel } from './TabPanel'

/**
 * Actual contents of the side panel
 *
 * @returns {JSX.Element[]} An array of Tab panels
 */

export const getTabContents = (selectedIndex: number): JSX.Element[] => {
  return [
    <TabPanel
      label="Sub Network Viewer"
      key={0}
      index={0}
      value={selectedIndex}
    >
      <ViewerPanel />
    </TabPanel>,
    <TabPanel label="Apps" key={1} index={1} value={selectedIndex}>
      <AppPanel />
    </TabPanel>,
  ]
}
