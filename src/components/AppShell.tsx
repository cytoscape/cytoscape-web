import { FC } from 'react'
import * as React from 'react'
import { ToolBar } from './ToolBar'
import { WorkSpaceEditor } from './WorkspaceEditor'

const AppShell: FC = () => {
  return (
    <div>
      <header>
        <ToolBar />
      </header>
      <main>
        <WorkSpaceEditor />
      </main>
      <footer>{/* <TableBrowser/> */}</footer>
      {/* <main>
        <MainSplitPane />
      </main>
      <footer>
        <FooterPanel />
      </footer> */}
    </div>
  )
}

export default AppShell
