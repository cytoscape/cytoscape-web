import { ReactElement } from 'react'
import { NetworkPanel } from './NetworkViewer/NetworkPanel'
// import { ToolBar } from './ToolBar'
// import { WorkSpaceEditor } from './WorkspaceEditor'

// Large
const L_NET_ID = 'f7a218c0-2376-11ea-bb65-0ac135e8bacf'
// Small
const S_NET_ID = '7fc70ab6-9fb1-11ea-aaef-0ac135e8bacf'

const AppShell = (): ReactElement => (
  <>
    {/* <ToolBar /> */}
    {/* <WorkSpaceEditor  /> */}
    <NetworkPanel uuids={[L_NET_ID, S_NET_ID]} />
  </>
)

export default AppShell
