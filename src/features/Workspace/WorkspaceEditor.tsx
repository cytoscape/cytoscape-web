import {
  Suspense,
  lazy,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import { Allotment } from 'allotment'
import { Box, Tooltip } from '@mui/material'

import {
  Outlet,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { getModelsFromCacheOrNdex } from '../../db/getModelsFromCacheOrNdex'
import { getSummariesFromCacheOrNdex } from '../../db/getNetworkSummaryFromCacheOrNdex'
import { useTableStore } from '../../hooks/stores/TableStore'
import { useVisualStyleStore } from '../../hooks/stores/VisualStyleStore'
import { useNetworkStore } from '../../hooks/stores/NetworkStore'
import { useViewModelStore } from '../../hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { useNetworkSummaryStore } from '../../hooks/stores/NetworkSummaryStore'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { AppConfigContext } from '../../AppConfigContext'
import { Workspace } from '../../models/WorkspaceModel'
import { NetworkView } from '../../models/ViewModel'
import { useWorkspaceManager } from '../../hooks/useWorkspaceManager'

import { useCredentialStore } from '../../hooks/stores/CredentialStore'
import { SnackbarMessageList } from '../Messages'
import { NetworkBrowserPanel } from './NetworkBrowserPanel/NetworkBrowserPanel'

import { SidePanel } from './SidePanel/SidePanel'
import { useUiStateStore } from '../../hooks/stores/UiStateStore'
import { Ui } from '../../models/UiModel'
import { PanelState } from '../../models/UiModel/PanelState'
import { OpenRightPanelButton } from './SidePanel/OpenRightPanelButton'
import { LayoutToolsBasePanel } from '../LayoutTools'
import { useNetworkViewManager } from '../../hooks/useNetworkViewManager'
import { useTableManager } from '../../hooks/useTableManager'
import { useHierarchyViewerManager } from '../HierarchyViewer/store/useHierarchyViewerManager'
import { useNetworkSummaryManager } from '../../hooks/useNetworkSummaryManager'
import { ChevronRight } from '@mui/icons-material'
import { Panel } from '../../models/UiModel/Panel'
import { LayoutEngine } from '../../models/LayoutModel'
import { useLayoutStore } from '../../hooks/stores/LayoutStore'
import { isHCX } from '../HierarchyViewer/utils/hierarchy-util'
import { HcxMetaTag } from '../HierarchyViewer/model/HcxMetaTag'
import { validateHcx } from '../HierarchyViewer/model/impl/hcxValidators'
import { useMessageStore } from '../../hooks/stores/MessageStore'
import { useHcxValidatorStore } from '../HierarchyViewer/store/HcxValidatorStore'
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
import { useCreateNetworkFromTableStore } from '../TableDataLoader/store/createNetworkFromTableStore'
import { useJoinTableToNetworkStore } from '../TableDataLoader/store/joinTableToNetworkStore'
import { getDefaultLayout } from '../../models/LayoutModel/impl/layoutSelection'
import { useAppManager } from '../../externalapps/useAppManager'
import { CyNetwork, VisualStyle } from '../../models'
import { useOpaqueAspectStore } from '../../hooks/stores/OpaqueAspectStore'
import { MessageSeverity } from '../../models/MessageModel'
import { useUndoStore } from '../../hooks/stores/UndoStore'
import { useRendererFunctionStore } from '../../hooks/stores/RendererFunctionStore'
import { logUi } from '../../debug'
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
      const viewModelChanged = !isEqual(
        // omit selection state and hovered element changes as valid viewModel changes
        omit(prev, ['selectedNodes', 'selectedEdges']),
        omit(next, ['selectedNodes', 'selectedEdges']),
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

    const visualStyleChanged = !isEqual(prevVisualStyle, nextVisualStyle)

    const { networkModified } = workspace

    const currentNetworkIsNotModified =
      networkModified[currentNetworkId] === undefined ||
      networkModified[currentNetworkId] === false

    if (visualStyleChanged && currentNetworkIsNotModified) {
      setNetworkModified(currentNetworkId, true)
    }
  })

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

  const getFunction = useRendererFunctionStore((state) => state.getFunction)

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

      const summaryMap = await getSummariesFromCacheOrNdex(
        [networkId],
        currentToken,
      )
      const summary = summaryMap[networkId]
      const res: CyNetwork = await getModelsFromCacheOrNdex(
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
              const fitFunction = getFunction('cyjs', 'fit', networkId)

              // Fit the viewport to center the initial layout
              if (fitFunction !== undefined) {
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
      logUi.error(
        `[${WorkSpaceEditor.name}]:[${loadCurrentNetworkById.name}]: Failed to load network: ${e}`,
      )
      setFailedToLoad(true)
    }
  }

  const params = useParams()

  /**
   * Swap the current network, can be an expensive operation
   */
  useEffect(
    function swapCurrentNetworkHook() {
      const currentNetworkId = params.networkId
      if (currentNetworkId === '' || currentNetworkId === undefined) {
        // No need to load new network
        return
      }

      if (isLoadingRef.current) {
        return
      }

      isLoadingRef.current = true
      setFailedToLoad(false)
      logUi.info(
        `[${WorkSpaceEditor.name}]:[${swapCurrentNetworkHook.name}]: Loading network: ${currentNetworkId}`,
      )

      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          // handle the case where the back/forward button is pressed
          setCurrentNetworkId(currentNetworkId)
        })
        .catch((err) => {
          logUi.error(
            `[${WorkSpaceEditor.name}]:[${swapCurrentNetworkHook.name}]: Failed to load network: ${err}`,
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
