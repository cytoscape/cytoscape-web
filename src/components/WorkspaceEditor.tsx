import * as React from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'

import TableBrowser from './TableBrowser'
import NetworkRenderer from './NetworkRenderer'
import WorkspaceView from './WorkspaceView'
import VizmapperView from './VizmapperView'

import { useWorkspaceStore, AppState } from '../hooks/useWorkspaceStore'

import tableData from '../data/../../data/exampleTableState.json'

export const WorkSpaceEditor: React.FC = () => {
  const { workspace, currentNetwork } = useWorkspaceStore(
    (state: AppState) => ({
      workspace: state.workspace,
      currentNetwork: state.currentNetwork,
    }),
  )

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment vertical>
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  <WorkspaceView workspace={workspace} />
                </Allotment.Pane>
                <Allotment.Pane>
                  <VizmapperView networkStyle={currentNetwork.visualStyle} />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane>
              <NetworkRenderer
                networkView={currentNetwork.networkView}
                network={currentNetwork.network}
              />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={38} preferredSize={38}>
          <TableBrowser tableData={tableData} />
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
