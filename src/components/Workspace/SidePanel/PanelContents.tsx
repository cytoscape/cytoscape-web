import { Typography } from '@mui/material'
import { ViewerPanel } from '../../../features/HierarchyViewer/components'
import { TabPanel } from './TabPanel'

/**
 * Actual contents of the side panel
 *
 * @returns {JSX.Element[]} An array of Tab panels
 */

export const getTabContents = (value: number): JSX.Element[] => {
  return [
    <TabPanel label="Hierarchy Viewer" key={0} index={0} value={value}>
      <ViewerPanel />
    </TabPanel>,
    <TabPanel label="test2" key={1} index={1} value={value}>
      <Typography variant="h5">Other new features here...</Typography>
    </TabPanel>,
  ]
}
