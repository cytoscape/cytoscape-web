import { Suspense, lazy, useContext, useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import _ from 'lodash'
import { Box, Paper, Tooltip } from '@mui/material'

import { Outlet, useNavigate } from 'react-router-dom'

import { useNdexNetwork } from '../../store/hooks/useNdexNetwork'
import { useNdexNetworkSummary } from '../../store/hooks/useNdexNetworkSummary'
import { useTableStore } from '../../store/TableStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useNetworkStore } from '../../store/NetworkStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { AppConfigContext } from '../../AppConfigContext'
import { Workspace } from '../../models/WorkspaceModel'
import { putNetworkViewToDb } from '../../store/persist/db'
import { NetworkView } from '../../models/ViewModel'
import { useWorkspaceManager } from '../../store/hooks/useWorkspaceManager'

import { useCredentialStore } from '../../store/CredentialStore'
import { SnackbarMessageList } from '../Messages'
import { NetworkBrowser } from './NetworkBrowser'

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { ViewerPanel } from '../../features/HierarchyViewer/components'

const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
const TableBrowser = lazy(() => import('../TableBrowser/TableBrowser'))

/**
 * The main workspace editor containing all except toolbar
 *
 */
const WorkSpaceEditor = (): JSX.Element => {
  useWorkspaceManager()

  // Open / close side panel for extra UI components
  const [openSidePanel, setOpenSidePanel] = useState<boolean>(false)

  // Server location
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const navigate = useNavigate()

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const credentialInitialized: boolean = useCredentialStore(
    (state) => state.initialized,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const viewModels: Record<string, NetworkView> = useViewModelStore(
    (state) => state.viewModels,
  )

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  // listen to view model changes
  // assume that if the view model change, the network has been modified and set the networkModified flag to true
  useViewModelStore.subscribe(
    (state) => state.viewModels[currentNetworkId],
    (prev: NetworkView, next: NetworkView) => {
      const viewModelChanged =
        prev !== undefined &&
        next !== undefined &&
        !_.isEqual(
          // omit selection state and hovered element changes as valid viewModel changes
          _.omit(prev, ['hoveredElement', 'selectedNodes', 'selectedEdges']),
          _.omit(next, ['hoveredElement', 'selectedNodes', 'selectedEdges']),
        )

      // primitve compare fn that does not take into account the selection/hover state
      // this leads to the network having a 'modified' state even though nothing was modified
      const { networkModified } = workspace
      const currentNetworkIsNotModified =
        networkModified[currentNetworkId] === undefined ??
        !networkModified[currentNetworkId] ??
        false

      if (viewModelChanged && currentNetworkIsNotModified) {
        setNetworkModified(currentNetworkId, true)
      }
    },
  )

  // Network Summaries
  const summaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )
  const setSummaries = useNetworkSummaryStore((state) => state.addAll)
  const removeSummary = useNetworkSummaryStore((state) => state.delete)

  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)

  const loadNetworkSummaries = async (): Promise<void> => {
    const currentToken = await getToken()
    const summaries = await useNdexNetworkSummary(
      workspace.networkIds,
      ndexBaseUrl,
      currentToken,
    )

    setSummaries(summaries)
  }

  const loadCurrentNetworkById = async (networkId: IdType): Promise<void> => {
    const currentToken = await getToken()
    const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
    const { network, nodeTable, edgeTable, visualStyle, networkView } = res

    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkView)
  }

  /**
   * Initializations
   */
  useEffect(() => {
    const windowWidthListener = (): void => {
      setTableBrowserWidth(window.innerWidth)
    }
    window.addEventListener('resize', windowWidthListener)

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [])

  /**
   * Check number of networks in the workspace
   */
  useEffect(() => {
    if (!credentialInitialized) {
      return
    }
    const networkCount: number = workspace.networkIds.length
    const summaryCount: number = Object.keys(summaries).length

    if (networkCount === 0 && summaryCount === 0) {
      return
    }

    // No action required if empty or no change
    if (networkCount === 0) {
      if (summaryCount !== 0) {
        // Remove the last one
        removeSummary(Object.keys(summaries)[0])
      }
      return
    }

    const summaryIds: IdType[] = [...Object.keys(summaries)]

    // Case 1: network removed
    if (networkCount < summaryCount) {
      const toBeRemoved: IdType[] = summaryIds.filter((id) => {
        return !workspace.networkIds.includes(id)
      })
      removeSummary(toBeRemoved[0])
      return
    }

    // Case 2: network added

    // TODO: Load only diffs
    loadNetworkSummaries()
      .then(() => {})
      .catch((err) => console.error(err))
  }, [workspace.networkIds, credentialInitialized])

  /**
   * Swap the current network, can be an expensive operation
   */
  useEffect(() => {
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      // No need to load new network
      return
    }

    // Update the DB first

    const currentNetworkView: NetworkView = viewModels[currentNetworkId]
    if (currentNetworkView === undefined) {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          navigate(`/${workspace.id}/networks/${currentNetworkId}`)
          console.log('Network loaded for', currentNetworkId)
        })
        .catch((err) => console.error('Failed to load a network:', err))
    } else {
      putNetworkViewToDb(currentNetworkId, currentNetworkView)
        .then(() => {
          console.info('* Network view saved to DB')
          loadCurrentNetworkById(currentNetworkId)
            .then(() => {
              navigate(`/${workspace.id}/networks/${currentNetworkId}`)
              console.log('Network loaded for', currentNetworkId)
            })
            .catch((err) => console.error('Failed to load a network:', err))
        })
        .catch((err) => {
          console.error('Failed to save network view to DB:', err)
        })
    }
  }, [currentNetworkId])

  /**
   * if there is no current network id set, set the first network in the workspace to the current network
   */
  useEffect(() => {
    let curId: IdType = ''
    if (
      currentNetworkId === undefined ||
      currentNetworkId === '' ||
      !workspace.networkIds.includes(currentNetworkId)
    ) {
      if (Object.keys(summaries).length !== 0) {
        curId = Object.keys(summaries)[0]
        setCurrentNetworkId(curId)
      }
    }
  }, [summaries, currentNetworkId])

  // TODO: avoid hardcoding pixel values

  // Return the main component including the network panel, network view, and the table browser
  return (
    <Box
      sx={{
        height: 'calc(100vh - 48px)',
      }}
    >
      <Allotment>
        <Allotment
          vertical
          onChange={(sizes: number[]) => {
            // sizes[0] represents the height of the top pane (network list, network renderer, vizmapper)
            // sizes[1] represents the height of the bottom pane (table browser)
            setAllotmentDimensions([sizes[0], sizes[1]])
            setTableBrowserHeight(sizes[1])
          }}
        >
          <Allotment>
            <Allotment.Pane preferredSize="25%">
              <NetworkBrowser allotmentDimensions={allotmentDimensions} />
            </Allotment.Pane>
            <Allotment.Pane>
              <Outlet />
              <NetworkPanel />
            </Allotment.Pane>
          </Allotment>
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
        {openSidePanel ? (
          <Box sx={{ height: '100%', width: '100%' }}>
            <Tooltip title="Close side">
              <ChevronRightIcon
                sx={{
                  zIndex: 1000,
                  position: 'absolute',
                  top: '5px',
                  left: '5px',
                  border: '1px solid #999999',
                }}
                onClick={() => setOpenSidePanel(!openSidePanel)}
              />
            </Tooltip>
            <ViewerPanel />
          </Box>
        ) : null}
      </Allotment>
      <SnackbarMessageList />
      {openSidePanel ? null : (
        <Tooltip title="Open side panel">
          <Paper
            sx={{
              position: 'absolute',
              top: '55px',
              right: '5px',
            }}
            onClick={() => setOpenSidePanel(!openSidePanel)}
          >
            <ChevronLeftIcon />
          </Paper>
        </Tooltip>
      )}
    </Box>
  )
}

export default WorkSpaceEditor
