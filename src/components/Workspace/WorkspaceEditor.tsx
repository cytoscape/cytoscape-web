import { Suspense, lazy, useContext, useEffect, useRef, useState } from 'react'
import { Allotment } from 'allotment'
import _ from 'lodash'
import { Box, Tooltip } from '@mui/material'

import { Outlet, useLocation, useSearchParams } from 'react-router-dom'

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
import { LayoutEngine } from '../../models/LayoutModel'
import { useLayoutStore } from '../../store/LayoutStore'
import { isHCX } from '../../features/HierarchyViewer/utils/hierarchy-util'
import { HcxMetaTag } from '../../features/HierarchyViewer/model/HcxMetaTag'
import { validateHcx } from '../../features/HierarchyViewer/model/impl/hcxValidators'
import { useMessageStore } from '../../store/MessageStore'
import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { CreateNetworkFromTableForm } from '../../features/TableDataLoader/components/CreateNetworkFromTable/CreateNetworkFromTableForm'
import { JoinTableToNetworkForm } from '../../features/TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkForm'
import { useCreateNetworkFromTableStore } from '../../features/TableDataLoader/store/createNetworkFromTableStore'
import { useJoinTableToNetworkStore } from '../../features/TableDataLoader/store/joinTableToNetworkStore'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { FilterUrlParams } from '../../models/FilterModel/FilterUrlParams'
import { DEFAULT_FILTER_NAME } from '../../features/HierarchyViewer/components/FilterPanel/FilterPanel'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../models/FilterModel'
import { GraphObjectType } from '../../models/NetworkModel'
import { useFilterStore } from '../../store/FilterStore'
import { useAppManager } from '../../store/hooks/useAppManager'
import { NetworkWithView, VisualStyle } from '../../models'
import { useOpaqueAspectStore } from '../../store/OpaqueAspectStore'
import { MessageSeverity } from '../../models/MessageModel'
import { useUndoStore } from '../../store/UndoStore'
import { useRendererFunctionStore } from '../../store/RendererFunctionStore'
import { useUrlNavigation } from '../../store/hooks/useUrlNavigation'

const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
const TableBrowser = lazy(() => import('../TableBrowser/TableBrowser'))

/**
 * The main workspace editor containing all except toolbar
 *
 */
const WorkSpaceEditor = (): JSX.Element => {
  // Subscribers to the stores
  useAppManager() // Register dynamically loaded apps to the store

  useWorkspaceManager()
  useNetworkViewManager()
  useTableManager()

  // Subscribers for optional features
  useHierarchyViewerManager()

  // Check if the component is initialized
  const isInitializedRef = useRef<boolean>(false)
  // Indicates if a network failed to load
  const [failedToLoad, setFailedToLoad] = useState<boolean>(false)
  const showTableJoinForm = useJoinTableToNetworkStore((state) => state.setShow)
  const showCreateNetworkFromTableForm = useCreateNetworkFromTableStore(
    (state) => state.setShow,
  )

  // Block multiple loading
  const isLoadingRef = useRef<boolean>(false)

  // Server location
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const { navigateToNetwork } = useUrlNavigation()
  const location = useLocation()

  const [search] = useSearchParams()

  const addFilterConfig = useFilterStore((state) => state.addFilterConfig)

  // For restoring the selection state from URL
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const ui: Ui = useUiStateStore((state) => state.ui)

  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

  const setActiveTableBrowserIndex = useUiStateStore(
    (state) => state.setActiveTableBrowserIndex,
  )

  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )

  const { panels, activeNetworkView } = ui

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const setValidationResult = useHcxValidatorStore(
    (state) => state.setValidationResult,
  )

  const allViewModels: Record<string, NetworkView[]> = useViewModelStore(
    (state) => state.viewModels,
  )
  const currentNetworkView: NetworkView | undefined =
    allViewModels[currentNetworkId]?.[0]

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  const addStack = useUndoStore((state) => state.addStack)
  // listen to view model changes
  // assume that if the view model change, the network has been modified and set the networkModified flag to true
  useViewModelStore.subscribe(
    (state) => state.getViewModel(currentNetworkId),
    (next: NetworkView, prev: NetworkView) => {
      if (prev === undefined || next === undefined) {
        return
      }

      // primitive compare fn that does not take into account the selection/hover state
      // this leads to the network having a 'modified' state even though nothing was modified
      const viewModelChanged = !_.isEqual(
        // omit selection state and hovered element changes as valid viewModel changes
        _.omit(prev, ['selectedNodes', 'selectedEdges']),
        _.omit(next, ['selectedNodes', 'selectedEdges']),
      )

      const { networkModified } = workspace

      const currentNetworkIsNotModified =
        networkModified[currentNetworkId] === undefined ||
        networkModified[currentNetworkId] === false

      if (viewModelChanged && currentNetworkIsNotModified) {
        setNetworkModified(currentNetworkId, true)
      }
    },
  )
  // listen to visual style changes
  useVisualStyleStore.subscribe((next, prev) => {
    const nextVisualStyle = next.visualStyles[currentNetworkId] as VisualStyle
    const prevVisualStyle = prev.visualStyles[currentNetworkId] as VisualStyle
    if (prevVisualStyle === undefined || nextVisualStyle === undefined) {
      return
    }

    const visualStyleChanged = !_.isEqual(prevVisualStyle, nextVisualStyle)

    const { networkModified } = workspace

    const currentNetworkIsNotModified =
      networkModified[currentNetworkId] === undefined ||
      networkModified[currentNetworkId] === false

    if (visualStyleChanged && currentNetworkIsNotModified) {
      setNetworkModified(currentNetworkId, true)
    }
  })

  // Network Summaries
  const summaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )

  const setSummaries = useNetworkSummaryStore((state) => state.addAll)
  const removeSummary = useNetworkSummaryStore((state) => state.delete)
  useNetworkSummaryManager()

  const [tableBrowserHeight, setTableBrowserHeight] = useState(100)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const addMessage = useMessageStore((state) => state.addMessage)

  const updateSummary = useNetworkSummaryStore((state) => state.update)

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const fitFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'fit', currentNetworkId),
  )

  const loadNetworkSummaries = async (networkIds: IdType[]): Promise<void> => {
    const currentToken = await getToken()
    const newSummaries = await useNdexNetworkSummary(
      networkIds,
      ndexBaseUrl,
      currentToken,
    )

    setSummaries({ ...summaries, ...newSummaries })

    const loadedNetworks = Object.keys(newSummaries)
    if (loadedNetworks.length !== networkIds.length) {
      const networksFailtoLoad = networkIds.filter(
        (id) => !loadedNetworks.includes(id),
      )
      const numOfNets = networksFailtoLoad.length
      const largestNum = 3
      const largeNum = numOfNets > largestNum
      deleteNetwork(networksFailtoLoad) // remove the networks that the app fails to load from the workspace
      addMessage({
        // show a message to the user
        message: `Failed to load ${networksFailtoLoad.length} network${largeNum ? 's' : ''} with id${largeNum ? 's' : ''}: ${
          largeNum
            ? networksFailtoLoad.slice(0, largestNum).join(', ') + '...'
            : networksFailtoLoad.join(', ')
        }`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  const { maxNetworkElementsThreshold } = useContext(AppConfigContext)

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

  const loadCurrentNetworkById = async (networkId: IdType): Promise<void> => {
    try {
      const currentToken = await getToken()

      const summaryMap = await useNdexNetworkSummary(
        [networkId],
        ndexBaseUrl,
        currentToken,
      )
      const summary = summaryMap[networkId]
      const res: NetworkWithView = await useNdexNetwork(
        networkId,
        ndexBaseUrl,
        currentToken,
      )
      const {
        network,
        nodeTable,
        edgeTable,
        visualStyle,
        networkViews,
        visualStyleOptions,
        otherAspects,
        undoRedoStack,
      } = res

      setVisualStyleOptions(networkId, visualStyleOptions)
      addNewNetwork(network)
      addVisualStyle(networkId, visualStyle)
      addTable(networkId, nodeTable, edgeTable)
      addViewModel(networkId, networkViews[0])
      if (otherAspects !== undefined) {
        addAllOpaqueAspects(networkId, otherAspects)
      }
      addStack(networkId, undoRedoStack)

      if (isHCX(summary)) {
        const version =
          summary.properties.find(
            (p) => p.predicateString === HcxMetaTag.ndexSchema,
          )?.value ?? ''
        const validationRes = validateHcx(version as string, summary, nodeTable)

        if (!validationRes.isValid) {
          addMessage({
            message: `This network is not a valid HCX network.  Some features may not work properly.`,
            duration: 5000,
            severity: MessageSeverity.WARNING,
          })
        }
        setValidationResult(networkId, validationRes)
      }

      if (!summary.hasLayout) {
        const defaultLayout = getDefaultLayout(
          summary,
          network.nodes.length + network.edges.length,
          maxNetworkElementsThreshold,
        )

        if (defaultLayout !== undefined) {
          const engine: LayoutEngine | undefined = layoutEngines.find(
            (engine) => engine.name === defaultLayout.engineName,
          )

          if (engine !== undefined) {
            const nextSummary = { ...summary, hasLayout: true }

            setIsRunning(true)
            const afterLayout = (
              positionMap: Map<IdType, [number, number]>,
            ): void => {
              updateNodePositions(networkId, positionMap)

              // Fit the viewport to center the initial layout
              if (fitFunction) {
                fitFunction()
              }

              updateSummary(networkId, nextSummary)
              setIsRunning(false)
              setNetworkModified(networkId, false)
            }

            engine.apply(
              network.nodes,
              network.edges,
              afterLayout,
              engine.algorithms[defaultLayout.algorithmName],
            )
          }
        }
      }
    } catch (e) {
      console.error('Failed to load network:', e)
      setFailedToLoad(true)
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

    // Just ignore if no selection states are provided in the URL
    if (
      selectedNodeStr === undefined ||
      selectedNodeStr === null ||
      selectedEdgeStr === undefined ||
      selectedEdgeStr === null
    ) {
      return
    }

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
   * Restore filter states from URL
   */
  const restoreFilterStates = (): void => {
    const filterFor = search.get(FilterUrlParams.FILTER_FOR)
    const filterBy = search.get(FilterUrlParams.FILTER_BY)
    const filterRange = search.get(FilterUrlParams.FILTER_RANGE)

    if (filterFor !== null && filterBy !== null && filterRange !== null) {
      const filterConfig: FilterConfig = {
        name: DEFAULT_FILTER_NAME,
        attributeName: filterBy,
        target:
          filterFor === GraphObjectType.NODE
            ? GraphObjectType.NODE
            : GraphObjectType.EDGE,
        widgetType: FilterWidgetType.CHECKBOX,
        description: 'Filter nodes / edges by selected values',
        label: 'Interaction edge filter',
        range: { values: filterRange.split(',') },
        displayMode: DisplayMode.SHOW_HIDE,
        // visualMapping,
      }
      addFilterConfig(filterConfig)
    }
  }

  const restoreActiveNetworkView = (): void => {
    const activeNetworkView = search.get('activeNetworkView')
    if (activeNetworkView !== null) {
      setActiveNetworkView(activeNetworkView)
    }
  }

  /**
   * Check number of networks in the workspace
   */
  useEffect(() => {
    const networkCount: number = workspace.networkIds.length
    const summaryCount: number = Object.keys(summaries).length

    // No action required if empty or no change
    if (networkCount === 0 && isInitializedRef.current === true) {
      if (summaryCount !== 0) {
        // Remove the last one
        removeSummary(Object.keys(summaries)[0])
      }
      navigateToNetwork({
        workspaceId: workspace.id,
      })
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
    const toBeAdded: IdType[] = workspace.networkIds.filter((id) => {
      return !summaryIds.includes(id)
    })
    loadNetworkSummaries(toBeAdded)
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
    setFailedToLoad(false)
    if (currentNetworkView === undefined) {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          const path = location.pathname
          if (path.includes(currentNetworkId)) {
            restoreSelectionStates()
            restoreTableBrowserTabState()
            restoreFilterStates()
            setTimeout(() => {
              restoreActiveNetworkView()
            }, 1000)
          }

          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: currentNetworkId,
            searchParams: new URLSearchParams(location.search),
          })
        })
        .catch((err) => {
          console.error('* Failed to load a network:', err)
        })
        .finally(() => {
          isLoadingRef.current = false
        })
    } else {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          restoreSelectionStates()

          restoreTableBrowserTabState()
          setTimeout(() => {
            restoreActiveNetworkView()
          }, 1000)

          navigateToNetwork({
            workspaceId: workspace.id,
            networkId: currentNetworkId,
            searchParams: new URLSearchParams(location.search),
          })
        })
        .catch((err) => {
          console.error('Failed to load a network:', err)
        })
        .finally(() => {
          isLoadingRef.current = false
        })
    }

    // Mark as initialized after loading the first network to avoid
    isInitializedRef.current = true
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
        height: '100%',
        width: '100%',
        overflow: 'hidden',
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
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      minHeight: '3em',
                      flexGrow: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <NetworkBrowserPanel
                      allotmentDimensions={allotmentDimensions}
                    />
                  </Box>
                  <Box sx={{ borderTop: '1px solid #AAAAAA' }}>
                    <LayoutToolsBasePanel />
                  </Box>
                </Box>
              )}
            </Allotment.Pane>
            <Allotment.Pane>
              <Outlet />
              <NetworkPanel
                networkId={currentNetworkId}
                failedToLoad={failedToLoad}
              />
            </Allotment.Pane>
          </Allotment>
          <Allotment.Pane
            minSize={28}
            preferredSize={'20%'} // 20% of the total height is the default size
            maxSize={
              // Max size is determined by the window height
              panels.bottom === PanelState.OPEN ? window.innerHeight * 0.9 : 18
            }
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
              <JoinTableToNetworkForm
                handleClose={() => showTableJoinForm(false)}
              />
              <CreateNetworkFromTableForm
                handleClose={() => showCreateNetworkFromTableForm(false)}
              />
            </Suspense>
          </Allotment.Pane>
        </Allotment>

        {panels.right === PanelState.OPEN && (
          <Allotment.Pane>
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0, // For shrink to hide
              }}
            >
              <OpenRightPanelButton
                toOpen={false}
                title="Close panel"
                show={panels.right === PanelState.OPEN}
              />
              <Box sx={{ flexGrow: 1, width: '100%' }}>
                <SidePanel />
              </Box>
            </Box>
          </Allotment.Pane>
        )}
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
