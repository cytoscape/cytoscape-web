import * as React from 'react'
import { Suspense, useState } from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'

import TableBrowser from './TableBrowser'
import NetworkRenderer from './NetworkRenderer'
// import WorkspaceView from './WorkspaceView'
import VizmapperView from './VizmapperView'

export const WorkSpaceEditor: React.FC = () => {
  const [currentNetworkId] = useState('182ca98d-84c0-11ec-b3be-0ac135e8bacf')
  // const [networks] = useState([
  // { name: 'medium', id: 'f7a218c0-2376-11ea-bb65-0ac135e8bacf' },
  // { name: 'small 1', id: '182ca98d-84c0-11ec-b3be-0ac135e8bacf' },
  // { name: 'small 2', id: '7d9598db-659d-11ed-a157-005056ae23aa' },
  // ])

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment vertical>
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  <div></div>
                </Allotment.Pane>
                <Allotment.Pane>
                  <Suspense
                    fallback={<div>{`Loading from NDEx`}</div>}
                    key={currentNetworkId}
                  >
                    <VizmapperView currentNetworkId={currentNetworkId} />
                  </Suspense>
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane>
              <Suspense
                fallback={<div>{`Loading from NDEx`}</div>}
                key={currentNetworkId}
              >
                <NetworkRenderer currentNetworkId={currentNetworkId} />
              </Suspense>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={38} preferredSize={150}>
          <Suspense
            fallback={<div>{`Loading from NDEx`}</div>}
            key={currentNetworkId}
          >
            <TableBrowser currentNetworkId={currentNetworkId} />
          </Suspense>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
