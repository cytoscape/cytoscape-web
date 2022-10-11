import { FC } from 'react'
import * as React from 'react'
import { ToolBar } from './ToolBar'
import { WorkSpaceEditor } from './WorkspaceEditor'

const AppShell: FC = () => {
  return (
    <div>
      <ToolBar />
      <WorkSpaceEditor />
    </div>
  )
}

export default AppShell
