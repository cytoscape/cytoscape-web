import * as React from 'react'
import { Suspense, useContext, useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import PaletteIcon from '@mui/icons-material/Palette'
import debounce from 'lodash.debounce'
import TableBrowser from './TableBrowser'
import VizmapperView from './Vizmapper'

import { Outlet, useNavigate } from 'react-router-dom'

import { getNdexNetwork } from '../store/useNdexNetwork'
import { useTableStore } from '../store/TableStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useNetworkStore } from '../store/NetworkStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { IdType } from '../models/IdType'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../models/NetworkSummaryModel'
import { AppConfigContext } from '../AppConfigContext'
import { Workspace } from '../models/WorkspaceModel'
import { SummaryPanel } from './SummaryPanel'
import { MessagePanel } from './MessagePanel'

const WorkSpaceEditor: React.FC = () => {
  // Server location
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const navigate = useNavigate()

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  // Network Summaries
  const summaries: Map<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )
  const fetchAllSummaries = useNetworkSummaryStore((state) => state.fetchAll)

  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const changeTab = (event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTabIndex(newValue)
  }

  const addNewNetwork = useNetworkStore((state) => state.add)

  // Visual Style Store
  const setVisualStyle = useVisualStyleStore((state) => state.set)

  // Table Store
  const setTables = useTableStore((state) => state.setTables)

  const setViewModel = useViewModelStore((state) => state.setViewModel)

  const loadNetworkSummaries = async (): Promise<void> => {
    await fetchAllSummaries(workspace.networkIds, ndexBaseUrl)
  }

  const loadCurrentNetworkById = async (networkId: IdType): Promise<void> => {
    try {
      const res = await getNdexNetwork(networkId, ndexBaseUrl)
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

  /**
   * Initializations
   */
  useEffect(() => {
    const windowWidthListener = debounce(() => {
      setTableBrowserWidth(window.innerWidth)
    }, 200)
    window.addEventListener('resize', windowWidthListener)

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [])

  /**
   * Check number of networks in the workspace
   */
  useEffect(() => {
    if (workspace.networkIds.length === 0) {
      return
    }
    // TODO: Load only diffs
    loadNetworkSummaries()
      .then(() => {})
      .catch((err) => console.error(err))
  }, [workspace.networkIds])

  useEffect(() => {
    if (currentNetworkId !== '' && currentNetworkId !== undefined) {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          console.log('Network loaded for', currentNetworkId)
        })
        .catch((err) => console.error(err))

      // Set URL to current network ID
      navigate(`/${workspace.id}/networks/${currentNetworkId}`)
    }
  }, [currentNetworkId])

  useEffect(() => {
    if (summaries.size === 0) {
      return
    }
    const curId: IdType = [...summaries.keys()][0]
    setCurrentNetworkId(curId)
  }, [summaries])

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
                      {summaries.size !== 0 ? (
                        [...summaries.values()].map((summary) => {
                          const uuid: IdType = summary.externalId

                          return (
                            <SummaryPanel
                              key={uuid}
                              summary={summary}
                              currentNetworkId={currentNetworkId}
                            />
                          )
                        })
                      ) : (
                        <MessagePanel message="No network in workspace" />
                      )}
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
