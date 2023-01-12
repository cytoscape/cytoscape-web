import * as React from 'react'
import { Suspense, useState } from 'react'
import { Allotment } from 'allotment'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import PaletteIcon from '@mui/icons-material/Palette'
import debounce from 'lodash.debounce'
import TableBrowser from './TableBrowser'
import VizmapperView from './Vizmapper'

import { Outlet, useNavigate } from 'react-router-dom'

import { getNdexNetwork, getNdexNetworkSet } from '../store/useNdexNetwork'
import { useTableStore } from '../store/TableStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useWorkspaceStore } from '../store/NetworkStore'
import { useViewModelStore } from '../store/ViewModelStore'

const testNetworkSet = '8d72ec80-1fc5-11ec-9fe4-0ac135e8bacf'

const WorkSpaceEditor: React.FC = () => {
  const navigate = useNavigate()

  const [currentNetworkId, setCurrentNetworkId] = useState('')
  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const changeTab = (event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTabIndex(newValue)
  }
  const [networkSetSummaries, setNetworkSummaries] = useState(
    [] as Array<{ id: string; name: string }>,
  )
  const addNewNetwork = useWorkspaceStore((state) => state.add)

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
    }, 200)
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

      navigate(`/workspaceIdHere/networks/${currentNetworkId}`)
    }
  }, [currentNetworkId])

  return (
    <Box sx={{ height: 'calc(100vh - 48px)' }}>
      <Allotment
        vertical
        onChange={debounce((sizes: number[]) => {
          // sizes[0] represents the height of the top pane (network list, network renderer, vizmapper)
          // sizes[1] represents the height of the bottom pane (table browser)
          setAllotmentDimensions([sizes[0], sizes[1]])
          setTableBrowserHeight(sizes[1])
        }, 200)}
      >
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="20%">
              <Box
                sx={{
                  // overflow: 'scroll',
                  height: '100%',
                }}
              >
                <Tabs
                  sx={{ display: 'flex', alignItems: 'center', height: '40px' }}
                  value={currentTabIndex}
                  onChange={changeTab}
                >
                  <Tab
                    icon={<ShareIcon />}
                    iconPosition="start"
                    label={<Typography variant="body2">WORKSPACE</Typography>}
                  />
                  <Tab
                    icon={<PaletteIcon />}
                    iconPosition="start"
                    label={<Typography variant="body2">STYLE</Typography>}
                  />
                </Tabs>
                <div hidden={currentTabIndex !== 0}>
                  {currentTabIndex === 0 && (
                    <Box
                      sx={{
                        overflow: 'scroll',
                        height: allotmentDimensions[0] - 48, // need to set a height to enable scroll in the network list
                        // 48 is the height of the tool bar
                        width: '100%',
                      }}
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
                              <a
                                href={ndexLink}
                                target="_blank"
                                rel="noreferrer"
                              >
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
                  )}
                </div>
                <div hidden={currentTabIndex !== 1}>
                  {currentTabIndex === 1 && (
                    <Box>
                      {' '}
                      <Suspense
                        fallback={<div>{`Loading from NDEx`}</div>}
                        key={currentNetworkId}
                      >
                        <VizmapperView
                          currentNetworkId={currentNetworkId}
                          height={allotmentDimensions[0]}
                        />
                      </Suspense>
                    </Box>
                  )}
                </div>
              </Box>
            </Allotment.Pane>
            <Allotment.Pane>
              <Outlet /> {/* Network Renderer will be injected here */}
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={28} preferredSize={150}>
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

export default WorkSpaceEditor
