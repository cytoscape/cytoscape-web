import * as React from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'

import TableBrowser from './TableBrowser'
import NetworkRenderer from './NetworkRenderer'
import WorkspaceView from './WorkspaceView'
import VizmapperView from './VizmapperView'

import { AppContext } from '../states/AppStateProvider'

export const WorkSpaceEditor: React.FC = () => {
  const appContext = React.useContext(AppContext)
  console.log(appContext)

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment vertical>
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  <WorkspaceView workspace={appContext.workspace} />
                </Allotment.Pane>
                <Allotment.Pane>
                  <VizmapperView
                    networkStyle={appContext.currentNetwork.visualStyle}
                  />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane>
              <NetworkRenderer
                networkView={appContext.currentNetwork.networkView}
                network={appContext.currentNetwork.network}
              />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={38} preferredSize={38}>
          <TableBrowser
            nodeTable={appContext.currentNetwork.nodeTable}
            edgeTable={appContext.currentNetwork.edgeTable}
          />
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
