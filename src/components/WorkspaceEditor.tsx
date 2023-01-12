import * as React from 'react'
import { Suspense, useContext, useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { Box } from '@mui/material'
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

// const testNetworkSet = '8d72ec80-1fc5-11ec-9fe4-0ac135e8bacf'

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
  const fetchSummary = useNetworkSummaryStore((state) => state.fetch)
  const fetchAllSummaries = useNetworkSummaryStore((state) => state.fetchAll)

  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)

  const addNewNetwork = useNetworkStore((state) => state.add)

  // Visual Style Store
  const setVisualStyle = useVisualStyleStore((state) => state.set)

  // Table Store
  const setTables = useTableStore((state) => state.setTables)

  const setViewModel = useViewModelStore((state) => state.setViewModel)

  const loadNetworkSet = async (): Promise<void> => {
    if (workspace.networkIds.length === 0) {
      return
    }

    try {
      const summaries: NdexNetworkSummary[] = await fetchAllSummaries(
        workspace.networkIds,
        ndexBaseUrl,
      )
      // setNetworkSummaries(summaries)
      const curId: IdType = summaries[0].externalId
      setCurrentNetworkId(curId)
    } catch (err) {
      console.log(err)
    }
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
   * Initialization
   */
  useEffect(() => {
    const windowWidthListener = debounce(() => {
      setTableBrowserWidth(window.innerWidth)
    }, 200)
    window.addEventListener('resize', windowWidthListener)

    loadNetworkSet()
      .then(() => {})
      .catch((err) => console.error(err))

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [workspace.networkIds])

  useEffect(() => {
    if (currentNetworkId !== '') {
      const summary = summaries.get(currentNetworkId)
      if (summary === undefined) {
        fetchSummary(currentNetworkId, ndexBaseUrl)
          .then((result) => {
            console.log('fetched Summary in', result)
          })
          .catch((err) => {
            console.error(err)
          })
      }

      console.log('Summary map', summaries)
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          console.log('Network loaded')
        })
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
          setTableBrowserHeight(sizes[1])
        }, 200)}
      >
        <Allotment.Pane>
          <Allotment>
            <Allotment.Pane preferredSize="30%">
              <Allotment vertical>
                <Allotment.Pane preferredSize="50%">
                  <Box
                    sx={{ overflow: 'scroll', height: '100%', width: '100%' }}
                  >
                    {[...summaries.values()].map((summary) => {
                      const uuid: IdType = summary.externalId

                      const ndexLink = `https://ndexbio.org/viewer/networks/${uuid}`
                      const cxLink = `https://ndexbio.org/v3/networks/${uuid}`
                      return (
                        <Box
                          sx={{
                            backgroundColor:
                              uuid === currentNetworkId ? 'gray' : 'white',
                            p: 1,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                          onClick={() => setCurrentNetworkId(uuid)}
                          key={uuid}
                        >
                          <Box sx={{ p: 1 }}> {summary.name}</Box>
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
              <Outlet /> {/* Network Renderer will be injected here */}
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

export default WorkSpaceEditor
