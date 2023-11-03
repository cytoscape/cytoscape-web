import { Suspense, lazy, useContext, useEffect, useRef, useState } from 'react'
import { Allotment } from 'allotment'
import _ from 'lodash'
import { Box, Tooltip } from '@mui/material'

import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

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
import { NetworkBrowserPanel } from './NetworkBrowserPanel/NetworkBrowserPanel'

import { SidePanel } from './SidePanel/SidePanel'
import { useUiStateStore } from '../../store/UiStateStore'
import { Ui } from '../../models/UiModel'
import { PanelState } from '../../models/UiModel/PanelState'
import { OpenRightPanelButton } from './SidePanel/OpenRightPanelButton'
import { LayoutToolsBasePanel } from '../LayoutTools'
import { useNetworkViewManager } from '../../store/hooks/useNetworkViewManager'
import { useTableManager } from '../../store/hooks/useTableManager'
import { useHierarchyViewerManager } from '../../features/HierarchyViewer/store/useHierarchyViewerManager'
import { useNetworkSummaryManager } from '../../store/hooks/useNetworkSummaryManager'
import { ChevronRight } from '@mui/icons-material'
import { Panel } from '../../models/UiModel/Panel'
import { SelectionStates } from '../FloatingToolBar/ShareNetworkButtton'
import { LayoutAlgorithm, LayoutEngine } from '../../models/LayoutModel'
import { useLayoutStore } from '../../store/LayoutStore'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarcy-util'

const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
const TableBrowser = lazy(() => import('../TableBrowser/TableBrowser'))

/**
 * The main workspace editor containing all except toolbar
 *
 */
const WorkSpaceEditor = (): JSX.Element => {
  // Subscribers to the stores
  useWorkspaceManager()
  useNetworkViewManager()
  useTableManager()

  // Subscribers for optional features
  useHierarchyViewerManager()

  // Block multiple loading
  const isLoadingRef = useRef<boolean>(false)

  // Server location
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const navigate = useNavigate()
  const location = useLocation()

  const [search] = useSearchParams()

  // For restoring the selection state from URL
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const ui: Ui = useUiStateStore((state) => state.ui)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

  const setActiveTableBrowserIndex = useUiStateStore(
    (state) => state.setActiveTableBrowserIndex,
  )
  const { panels, activeNetworkView } = ui

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const viewModels: Record<string, NetworkView> = useViewModelStore(
    (state) => state.viewModels,
  )
  const currentNetworkView: NetworkView = viewModels[currentNetworkId]

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  // listen to view model changes
  // assume that if the view model change, the network has been modified and set the networkModified flag to true
  useViewModelStore.subscribe(
    (state) => state.viewModels[currentNetworkId],
    (prev: NetworkView, next: NetworkView) => {
      if (prev === undefined || next === undefined) {
        return
      }
      const viewModelChanged =
        prev !== undefined &&
        next !== undefined &&
        !_.isEqual(
          // omit selection state and hovered element changes as valid viewModel changes
          _.omit(prev, ['selectedNodes', 'selectedEdges']),
          _.omit(next, ['selectedNodes', 'selectedEdges']),
        )

      // primitve compare fn that does not take into account the selection/hover state
      // this leads to the network having a 'modified' state even though nothing was modified
      const { networkModified } = workspace
      const currentNetworkIsNotModified =
        (networkModified[currentNetworkId] === undefined &&
          !networkModified[currentNetworkId]) ??
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
  useNetworkSummaryManager()

  const [tableBrowserHeight, setTableBrowserHeight] = useState(200)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const defaultLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )

  const defaultHierarchyLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredHierarchicalLayout,
  )
  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

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

    const summaryMap = await useNdexNetworkSummary(
      [networkId],
      ndexBaseUrl,
      currentToken,
    )
    const summary = summaryMap[networkId]
    const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
    const { network, nodeTable, edgeTable, visualStyle, networkView } = res

    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkView)

    if (!summary.hasLayout) {
      const layoutEngineName = isHCX(summary)
        ? defaultHierarchyLayout.name
        : defaultLayout.name
      const engine: LayoutEngine =
        layoutEngines.find((engine) => engine.name === layoutEngineName) ??
        layoutEngines[0]

      const nextSummary = { ...summary, hasLayout: true }

      setIsRunning(true)
      const afterLayout = (
        positionMap: Map<IdType, [number, number]>,
      ): void => {
        updateNodePositions(networkId, positionMap)
        updateSummary(networkId, nextSummary)
        setIsRunning(false)
      }

      engine.apply(
        network.nodes,
        network.edges,
        afterLayout,
        engine.algorithms[layoutEngineName],
      )
    }
  }

  const restorePanelStates = (): void => {
    // Set panel states based on the Search params
    const leftPanelState: PanelState = search.get(Panel.LEFT) as PanelState
    const rightPanelState: PanelState = search.get(Panel.RIGHT) as PanelState
    const bottomPanelState: PanelState = search.get(Panel.BOTTOM) as PanelState

    if (leftPanelState !== undefined && leftPanelState !== null) {
      setPanelState(Panel.LEFT, leftPanelState)
    }
    if (rightPanelState !== undefined && rightPanelState !== null) {
      setPanelState(Panel.RIGHT, rightPanelState)
    }
    if (bottomPanelState !== undefined && bottomPanelState !== null) {
      setPanelState(Panel.BOTTOM, bottomPanelState)
    }
  }

  const restoreTableBrowserTabState = (): void => {
    const tableBrowserTab = search.get('activeTableBrowserTab')

    if (tableBrowserTab != null) {
      setActiveTableBrowserIndex(Number(tableBrowserTab))
    }
  }

  /**
   * Restore the node / edge selection states from URL
   */
  const restoreSelectionStates = (): void => {
    const selectedNodeStr = search.get(SelectionStates.SelectedNodes)
    const selectedEdgeStr = search.get(SelectionStates.SelectedEdges)

    let selectedNodes: IdType[] = []
    let selectedEdges: IdType[] = []

    if (selectedNodeStr !== undefined && selectedNodeStr !== null) {
      selectedNodes = selectedNodeStr.split(' ')
    }

    if (selectedEdgeStr !== undefined && selectedEdgeStr !== null) {
      selectedEdges = selectedEdgeStr.split(' ')
    }

    exclusiveSelect(currentNetworkId, selectedNodes, selectedEdges)
  }

  /**
   * Initializations
   */
  useEffect(() => {
    const windowWidthListener = (): void => {
      setTableBrowserWidth(window.innerWidth)
    }
    window.addEventListener('resize', windowWidthListener)

    restorePanelStates()
    restoreTableBrowserTabState()

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [])

  /**
   * Check number of networks in the workspace
   */
  useEffect(() => {
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
  }, [workspace.networkIds])

  /**
   * Swap the current network, can be an expensive operation
   */
  useEffect(() => {
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      // No need to load new network
      return
    }

    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true

    if (currentNetworkView === undefined) {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          const path = location.pathname
          if (path.includes(currentNetworkId)) {
            restoreSelectionStates()
            restoreTableBrowserTabState()
          }

          navigate(
            `/${
              workspace.id
            }/networks/${currentNetworkId}${location.search.toString()}`,
          )
        })
        .catch((err) => console.error('Failed to load a network:', err))
        .finally(() => {
          isLoadingRef.current = false
        })
    } else {
      putNetworkViewToDb(currentNetworkId, currentNetworkView)
        .then(() => {
          loadCurrentNetworkById(currentNetworkId)
            .then(() => {
              // restoreSelectionStates()
              restoreTableBrowserTabState()
              navigate(
                `/${
                  workspace.id
                }/networks/${currentNetworkId}${location.search.toString()}`,
              )
            })
            .catch((err) => console.error('Failed to load a network:', err))
        })
        .catch((err) => {
          console.error('Failed to save network view to DB:', err)
        })
        .finally(() => {
          isLoadingRef.current = false
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
  }, [summaries])

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
            <Allotment.Pane
              maxSize={panels.left === PanelState.OPEN ? 450 : 18}
            >
              {panels.left === PanelState.CLOSED ? (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Tooltip title="Open network panel" arrow placement="right">
                    <ChevronRight
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setPanelState(Panel.LEFT, PanelState.OPEN)}
                    />
                  </Tooltip>
                </Box>
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      flexGrow: 2,
                      boxSizing: 'border-box',
                      overflow: 'auto',
                    }}
                  >
                    <NetworkBrowserPanel
                      allotmentDimensions={allotmentDimensions}
                    />
                  </div>
                  <LayoutToolsBasePanel />
                </Box>
              )}
            </Allotment.Pane>
            <Allotment.Pane>
              <Outlet />
              <NetworkPanel networkId={currentNetworkId} />
            </Allotment.Pane>
          </Allotment>
          <Allotment.Pane
            minSize={28}
            preferredSize={tableBrowserHeight}
            maxSize={panels.bottom === PanelState.OPEN ? 450 : 18}
          >
            <Suspense
              fallback={<div>{`Loading from NDEx`}</div>}
              key={currentNetworkId}
            >
              <TableBrowser
                setHeight={setTableBrowserHeight}
                height={tableBrowserHeight}
                width={tableBrowserWidth}
                currentNetworkId={
                  activeNetworkView === undefined || activeNetworkView === ''
                    ? currentNetworkId
                    : activeNetworkView
                }
              />
            </Suspense>
          </Allotment.Pane>
        </Allotment>

        {panels.right === PanelState.OPEN ? (
          <Box sx={{ width: '100%', height: '100%' }}>
            <OpenRightPanelButton
              toOpen={false}
              title="Close panel"
              show={panels.right === PanelState.OPEN}
            />
            <SidePanel />
          </Box>
        ) : null}
      </Allotment>
      <SnackbarMessageList />
      <OpenRightPanelButton
        toOpen={true}
        title="Open panel"
        show={panels.right === PanelState.CLOSED}
      />
    </Box>
  )
}

export default WorkSpaceEditor
