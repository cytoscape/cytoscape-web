import * as React from 'react'
import { Suspense, useState } from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'
import debounce from 'lodash.debounce'

import TableBrowser from './TableBrowser'
import NetworkRenderer from './NetworkRenderer'
// import WorkspaceView from './WorkspaceView'
import VizmapperView from './Vizmapper'

import { getNdexNetwork, getNdexNetworkSet } from '../store/useNdexNetwork'
import { useTableStore } from '../store/TableStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useNetworkStore } from '../store/NetworkStore'
import { useViewModelStore } from '../store/ViewModelStore'

const testNetworkSet = '8d72ec80-1fc5-11ec-9fe4-0ac135e8bacf'

export const WorkSpaceEditor: React.FC = () => {
  const [currentNetworkId, setCurrentNetworkId] = useState('')
  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)

  const [networkSetSummaries, setNetworkSummaries] = useState(
    [] as Array<{ id: string; name: string }>,
  )
  const addNewNetwork = useNetworkStore((state) => state.add)

  // Visual Style Store
  const setVisualStyle = useVisualStyleStore((state) => state.set)

  // Table Store
  const setTables = useTableStore((state) => state.setTables)

  const setViewModel = useViewModelStore((state) => state.setViewModel)

  const loadNetworkSet = async (networkSetId: string): Promise<void> => {
    try {
      const summaries = await getNdexNetworkSet(networkSetId)
      setNetworkSummaries(summaries)
      setCurrentNetworkId(summaries[0].id)
    } catch (err) {
      console.log(err)
    }
  }

  const loadCurrentNetworkById = async (networkId: string): Promise<void> => {
    try {
      const res = await getNdexNetwork(networkId)
      const { network, nodeTable, edgeTable, visualStyle, networkView } = res

      addNewNetwork(network)
      setVisualStyle(networkId, visualStyle)
      setTables(networkId, nodeTable, edgeTable)
      setViewModel(networkId, networkView)
      window.n = network
      window.nt = nodeTable
      window.et = edgeTable
      window.vs = visualStyle
      window.nv = networkView
    } catch (err) {
      console.error(err)
    }
  }

  React.useEffect(() => {
    const windowWidthListener = debounce(() => {
      setTableBrowserWidth(window.innerWidth)
    }, 100)
    window.addEventListener('resize', windowWidthListener)

    loadNetworkSet(testNetworkSet)
      .then(() => {})
      .catch((err) => console.error(err))

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [])

  React.useEffect(() => {
    if (currentNetworkId !== '') {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {})
        .catch((err) => console.error(err))
    }
  }, [currentNetworkId])

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment
        vertical
        onChange={(sizes: number[]) => {
          // sizes[0] represents the height of the top pane (network list, network renderer, vizmapper)
          // sizes[1] represents the height of the bottom pane (table browser)
          setTableBrowserHeight(sizes[1])
        }}
      >
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  <Box
                    sx={{ overflow: 'scroll', height: '100%', width: '100%' }}
                  >
                    {networkSetSummaries.map((n) => {
                      const ndexLink = `https://ndexbio.org/viewer/networks/${n.id}`
                      const cxLink = `https://ndexbio.org/v3/networks/${n.id}`
                      return (
                        <Box
                          sx={{
                            backgroundColor:
                              n.id === currentNetworkId ? 'gray' : 'white',
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                          onClick={() => setCurrentNetworkId(n.id)}
                          key={n.id}
                        >
                          <Box sx={{ p: 1 }}> {n.name}</Box>
                          <Box
                            sx={{
                              p: 1,
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <a href={ndexLink} target="_blank" rel="noreferrer">
                              Compare in NDEx
                            </a>
                            <a href={cxLink} target="_blank" rel="noreferrer">
                              Debug cx
                            </a>
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
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
            <TableBrowser
              height={tableBrowserHeight}
              width={tableBrowserWidth}
              currentNetworkId={currentNetworkId}
            />
          </Suspense>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
