import * as React from 'react'
import { Suspense, useState } from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'

import TableBrowser from './TableBrowser'
import NetworkRenderer from './NetworkRenderer'
// import WorkspaceView from './WorkspaceView'
import VizmapperView from './VizmapperView'

import { getNdexNetwork } from '../store/useNdexNetwork'
import { useTableStore } from '../store/TableStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useNetworkStore } from '../store/NetworkStore'

export const WorkSpaceEditor: React.FC = () => {
  // const [currentNetworkId] = useState('182ca98d-84c0-11ec-b3be-0ac135e8bacf')
  const [currentNetworkId, setCurrentNetworkId] = useState(
    '3c94930a-6e12-11ed-a157-005056ae23aa',
  )

  const [networks] = useState([
    { name: 'liver', id: '3c94930a-6e12-11ed-a157-005056ae23aa' },
    { name: 'medium', id: 'f7a218c0-2376-11ea-bb65-0ac135e8bacf' },
    { name: 'small 1', id: '182ca98d-84c0-11ec-b3be-0ac135e8bacf' },
    { name: 'small 2', id: '7d9598db-659d-11ed-a157-005056ae23aa' },
  ])
  const addNewNetwork = useNetworkStore((state) => state.add)

  // Visual Style Store
  const setVisualStyle = useVisualStyleStore((state) => state.set)

  // Table Store
  const setTables = useTableStore((state) => state.setTables)

  const getNetwork = async (): Promise<void> => {
    try {
      const res = await getNdexNetwork(currentNetworkId)
      const { network, nodeTable, edgeTable, visualStyle } = res

      addNewNetwork(network)
      setVisualStyle(currentNetworkId, visualStyle)
      setTables(currentNetworkId, nodeTable, edgeTable)
    } catch (err) {
      console.error(err)
    }
  }

  React.useEffect(() => {
    getNetwork()
      .then(() => {})
      .catch((err) => console.error(err))
  }, [currentNetworkId])

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment vertical>
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  {networks.map((n) => {
                    return (
                      <Box
                        sx={{
                          backgroundColor:
                            n.id === currentNetworkId ? 'gray' : 'white',
                          p: 1,
                        }}
                        onClick={() => setCurrentNetworkId(n.id)}
                        key={n.id}
                      >
                        {n.name}
                      </Box>
                    )
                  })}
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
