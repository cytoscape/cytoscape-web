import { ReactElement } from 'react'
import { ToolBar } from './ToolBar'
import { WorkSpaceEditor } from './WorkspaceEditor'

const AppShell = (): ReactElement => (
  <>
    <ToolBar />
    <WorkSpaceEditor />
  </>
)

export default AppShell
