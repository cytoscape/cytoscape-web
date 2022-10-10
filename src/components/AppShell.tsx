import { FC } from 'react'
import * as React from 'react'
import { ToolBar } from './ToolBar'
import { WorkSpaceEditor } from './WorkspaceEditor'

import { AppContext } from '../states/AppStateProvider'

const AppShell: FC = () => {
  // import appcontext to acccess the global state
  const appContext = React.useContext(AppContext)
  console.log(appContext)

  return (
    <div>
      <ToolBar />
      <WorkSpaceEditor />
    </div>
  )
}

export default AppShell
