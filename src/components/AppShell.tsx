import { ReactElement } from 'react'
import { NetworkViewer } from './NetworkViewer'
import { ToolBar } from './ToolBar'
import { WorkSpaceEditor } from './WorkspaceEditor'

const AppShell = (): ReactElement => (
  <>
    {/* <ToolBar /> */}
    {/* <WorkSpaceEditor  /> */}
    <NetworkViewer />
  </>
)

export default AppShell
