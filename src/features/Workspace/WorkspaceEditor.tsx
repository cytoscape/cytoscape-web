import { ChevronRight } from '@mui/icons-material'
import { Box, Tooltip } from '@mui/material'
import { Allotment } from 'allotment'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import { lazy, Suspense, useContext, useEffect, useRef, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import { useCredentialStore } from '../../data/hooks/stores/CredentialStore'
import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useLoadCyNetwork } from '../../data/hooks/useLoadCyNetwork'
import { useLoadNetworkSummaries } from '../../data/hooks/useLoadNetworkSummaries'
import { IdType } from '../../models/IdType'
import { LayoutEngine } from '../../models/LayoutModel'
import { Ui } from '../../models/UiModel'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { NetworkView } from '../../models/ViewModel'
import { Workspace } from '../../models/WorkspaceModel'
import { HcxMetaTag } from '../HierarchyViewer/model/HcxMetaTag'
import { validateHcx } from '../HierarchyViewer/model/impl/hcxValidators'
import { useHcxValidatorStore } from '../HierarchyViewer/store/HcxValidatorStore'
import { useHierarchyViewerManager } from '../HierarchyViewer/store/useHierarchyViewerManager'
import { isHCX } from '../HierarchyViewer/utils/hierarchyUtil'
import { LayoutToolsBasePanel } from '../LayoutTools'
import { SnackbarMessageList } from '../Messages'
import { NetworkBrowserPanel } from './NetworkBrowserPanel/NetworkBrowserPanel'
import { OpenRightPanelButton } from './SidePanel/OpenRightPanelButton'
import { SidePanel } from './SidePanel/SidePanel'
// Lazy load heavy TableDataLoader forms
const CreateNetworkFromTableForm = lazy(() =>
  import(
    '../TableDataLoader/components/CreateNetworkFromTable/CreateNetworkFromTableForm'
  ).then((module) => ({ default: module.CreateNetworkFromTableForm })),
)
const JoinTableToNetworkForm = lazy(() =>
  import(
    '../TableDataLoader/components/JoinTableToNetwork/JoinTableToNetworkForm'
  ).then((module) => ({ default: module.JoinTableToNetworkForm })),
)
import { AppConfigContext } from '../../AppConfigContext'
import { logUi } from '../../debug'
import { useAppManager } from '../../data/hooks/stores/useAppManager'
import { useOpaqueAspectStore } from '../../data/hooks/stores/OpaqueAspectStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { CyNetwork, VisualStyle } from '../../models'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { MessageSeverity } from '../../models/MessageModel'
import { useCreateNetworkFromTableStore } from '../TableDataLoader/store/createNetworkFromTableStore'
import { useJoinTableToNetworkStore } from '../TableDataLoader/store/joinTableToNetworkStore'
const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
const TableBrowser = lazy(() => import('../TableBrowser/TableBrowser'))

/**
 * Main workspace editor component that provides the layout and network management interface
 *
 * Responsibilities:
 * - Manages workspace layout with resizable panels (left, right, bottom)
 * - Loads and displays networks from the workspace
 * - Handles network switching and loading
 * - Monitors network modifications (view model and visual style changes)
 * - Applies default layouts to networks without layouts
 * - Validates HCX networks
 * - Coordinates with multiple managers and stores
 *
 * Layout Structure:
 * - Left Panel: Network browser and layout tools (collapsible)
 * - Center: Network renderer (via Outlet and NetworkPanel)
 * - Bottom Panel: Table browser (resizable)
 * - Right Panel: Side panel with additional tools (collapsible)
 */
const WorkSpaceEditor = (): JSX.Element => {
  // Subscribers to the stores
  useAppManager() // Register dynamically loaded apps to the store

  // Subscribers for optional features
  useHierarchyViewerManager()

  // Indicates if a network failed to load
  const [failedToLoad, setFailedToLoad] = useState<boolean>(false)
  const showTableJoinForm = useJoinTableToNetworkStore((state) => state.setShow)
  const showCreateNetworkFromTableForm = useCreateNetworkFromTableStore(
    (state) => state.setShow,
  )

  // Block multiple loading
  const isLoadingRef = useRef<boolean>(false)

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const ui: Ui = useUiStateStore((state) => state.ui)

  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

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

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  const addStack = useUndoStore((state) => state.addStack)

  /**
   * Monitors view model changes to detect network modifications
   * Excludes selection state changes (selectedNodes, selectedEdges) from modification detection
   * Sets networkModified flag when view model changes and network is not already marked as modified
   */
  useViewModelStore.subscribe(
    (state) => state.getViewModel(currentNetworkId),
    (nextViewModel: NetworkView, prevViewModel: NetworkView) => {
      if (prevViewModel === undefined || nextViewModel === undefined) {
        return
      }

      // Compare view models excluding selection state
      // Selection changes don't count as network modifications
      const viewModelChanged = !isEqual(
        omit(prevViewModel, ['selectedNodes', 'selectedEdges']),
        omit(nextViewModel, ['selectedNodes', 'selectedEdges']),
      )

      const { networkModified } = workspace
      const isCurrentNetworkUnmodified =
        networkModified[currentNetworkId] === undefined ||
        networkModified[currentNetworkId] === false

      if (viewModelChanged && isCurrentNetworkUnmodified) {
        setNetworkModified(currentNetworkId, true)
      }
    },
  )

  /**
   * Monitors visual style changes to detect network modifications
   * Sets networkModified flag when visual style changes and network is not already marked as modified
   */
  useVisualStyleStore.subscribe((next, prev) => {
    const nextVisualStyle = next.visualStyles[currentNetworkId] as VisualStyle
    const prevVisualStyle = prev.visualStyles[currentNetworkId] as VisualStyle
    if (prevVisualStyle === undefined || nextVisualStyle === undefined) {
      return
    }

    const visualStyleChanged = !isEqual(prevVisualStyle, nextVisualStyle)
    const { networkModified } = workspace
    const isCurrentNetworkUnmodified =
      networkModified[currentNetworkId] === undefined ||
      networkModified[currentNetworkId] === false

    if (visualStyleChanged && isCurrentNetworkUnmodified) {
      setNetworkModified(currentNetworkId, true)
    }
  })

  const [tableBrowserHeight, setTableBrowserHeight] = useState(100)
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

  const loadCyNetwork = useLoadCyNetwork()
  const loadNetworkSummaries = useLoadNetworkSummaries()

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const addAllOpaqueAspects = useOpaqueAspectStore((state) => state.addAll)
  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  const getFunction = useRendererFunctionStore((state) => state.getFunction)

  const { maxNetworkElementsThreshold } = useContext(AppConfigContext)

  /**
   * Loads a network by ID and populates all related stores
   * Handles network data, visual styles, tables, views, validation, and layout
   * @param networkId - The ID of the network to load
   */
  const loadCurrentNetworkById = async (networkId: IdType): Promise<void> => {
    try {
      const currentToken = await getToken()

      const summaryMap = await loadNetworkSummaries([networkId], currentToken)
      const summary = summaryMap[networkId]
      const cyNetworkData: CyNetwork = await loadCyNetwork(
        networkId,
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
      } = cyNetworkData

      setVisualStyleOptions(networkId, visualStyleOptions)
      addNewNetwork(network)
      addVisualStyle(networkId, visualStyle)
      addTable(networkId, nodeTable, edgeTable)
      addViewModel(networkId, networkViews[0])
      if (otherAspects !== undefined) {
        addAllOpaqueAspects(networkId, otherAspects)
      }
      addStack(networkId, undoRedoStack)

      // Validate HCX networks if applicable
      if (isHCX(summary)) {
        const hcxVersion =
          summary.properties.find(
            (p) => p.predicateString === HcxMetaTag.ndexSchema,
          )?.value ?? ''
        const validationResult = validateHcx(
          hcxVersion as string,
          summary,
          nodeTable,
        )

        if (!validationResult.isValid) {
          const HCX_WARNING_DURATION_MS = 5000
          addMessage({
            message: `This network is not a valid HCX network.  Some features may not work properly.`,
            duration: HCX_WARNING_DURATION_MS,
            severity: MessageSeverity.WARNING,
          })
        }
        setValidationResult(networkId, validationResult)
      }

      // Apply default layout if network doesn't have one
      if (!summary.hasLayout) {
        const totalNetworkElements = network.nodes.length + network.edges.length
        const defaultLayout = getDefaultLayout(
          summary,
          totalNetworkElements,
          maxNetworkElementsThreshold,
        )

        if (defaultLayout !== undefined) {
          const layoutEngine: LayoutEngine | undefined = layoutEngines.find(
            (engine) => engine.name === defaultLayout.engineName,
          )

          if (layoutEngine !== undefined) {
            const summaryWithLayout = { ...summary, hasLayout: true }

            setIsRunning(true)
            const handleLayoutComplete = (
              positionMap: Map<IdType, [number, number]>,
            ): void => {
              updateNodePositions(networkId, positionMap)
              const fitFunction = getFunction('cyjs', 'fit', networkId)

              // Fit the viewport to center the initial layout
              if (fitFunction !== undefined) {
                fitFunction()
              }

              updateSummary(networkId, summaryWithLayout)
              setIsRunning(false)
              setNetworkModified(networkId, false)
            }

            layoutEngine.apply(
              network.nodes,
              network.edges,
              handleLayoutComplete,
              layoutEngine.algorithms[defaultLayout.algorithmName],
            )
          }
        }
      }
    } catch (error) {
      logUi.error(
        `[${WorkSpaceEditor.name}]:[${loadCurrentNetworkById.name}]: Failed to load network: ${error}`,
      )
      setFailedToLoad(true)
    }
  }

  const params = useParams()

  /**
   * Swaps the current network when URL parameter changes
   * This is an expensive operation that loads network data, styles, tables, and views
   * Uses a loading ref to prevent concurrent loads
   */
  useEffect(
    function swapCurrentNetworkHook() {
      const networkIdFromParams = params.networkId
      if (networkIdFromParams === '' || networkIdFromParams === undefined) {
        // No need to load new network
        return
      }

      if (isLoadingRef.current) {
        return
      }

      isLoadingRef.current = true
      setFailedToLoad(false)
      logUi.info(
        `[${WorkSpaceEditor.name}]:[${swapCurrentNetworkHook.name}]: Loading network: ${networkIdFromParams}`,
      )

      loadCurrentNetworkById(networkIdFromParams)
        .then(() => {
          // Handle the case where the back/forward button is pressed
          setCurrentNetworkId(networkIdFromParams)
          // Synchronize activeNetworkView with currentNetworkId
          if (networkIdFromParams === '') {
            setActiveNetworkView('')
          } else {
            setActiveNetworkView(networkIdFromParams)
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        })
        .catch((error) => {
          logUi.error(
            `[${WorkSpaceEditor.name}]:[${swapCurrentNetworkHook.name}]: Failed to load network: ${error}`,
          )
        })
        .finally(() => {
          isLoadingRef.current = false
        })
    },
    [params.networkId],
  )

  // Return the main component including the network panel, network view, and the table browser
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Allotment data-testid="workspace-editor">
        <Allotment
          vertical
          onChange={(sizes: number[]) => {
            // sizes[0] = height of top pane (network list, network renderer, vizmapper)
            // sizes[1] = height of bottom pane (table browser)
            const [topPaneHeight, bottomPaneHeight] = sizes
            setAllotmentDimensions([topPaneHeight, bottomPaneHeight])
            setTableBrowserHeight(bottomPaneHeight)
          }}
        >
          <Allotment>
            <Allotment.Pane
              maxSize={panels.left === PanelState.OPEN ? 450 : 18}
            >
              {panels.left === PanelState.CLOSED ? (
                <Box
                  data-testid="workspace-editor-left-panel-closed"
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
                      data-testid="workspace-editor-open-left-panel-button"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setPanelState(Panel.LEFT, PanelState.OPEN)}
                    />
                  </Tooltip>
                </Box>
              ) : (
                <Box
                  data-testid="workspace-editor-left-panel-open"
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
            <Allotment.Pane data-testid="workspace-editor-center-pane">
              <Outlet />
              <NetworkPanel
                networkId={currentNetworkId}
                failedToLoad={failedToLoad}
              />
            </Allotment.Pane>
          </Allotment>
          <Allotment.Pane
            data-testid="workspace-editor-bottom-pane"
            minSize={28}
            preferredSize={'20%'} // 20% of the total height is the default size
            maxSize={
              // Max size is determined by the window height
              panels.bottom === PanelState.OPEN ? window.innerHeight * 0.9 : 18
            }
          >
            <Suspense
              fallback={
                <div data-testid="workspace-editor-table-browser-loading">
                  {`Loading from NDEx`}
                </div>
              }
              key={currentNetworkId}
            >
              <TableBrowser
                setHeight={setTableBrowserHeight}
                height={tableBrowserHeight}
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
          <Allotment.Pane data-testid="workspace-editor-right-pane">
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
