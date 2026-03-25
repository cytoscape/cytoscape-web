import { Box } from '@mui/material'
import cloneDeep from 'lodash/cloneDeep'
import React, { ReactElement, useContext, useEffect, useRef } from 'react'
import {
  Location,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { initEventBus } from '../app-api/event-bus/initEventBus'
import { AppConfigContext } from '../AppConfigContext'
import {
  getUiStateFromDb,
  getWorkspaceFromDb,
  putNetworkSummaryToDb,
} from '../data/db/'
import { fetchNdexSummaries } from '../data/external-api/ndex'
import { useCredentialStore } from '../data/hooks/stores/CredentialStore'
import { useFilterStore } from '../data/hooks/stores/FilterStore'
import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../data/hooks/stores/TableStore'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../data/hooks/stores/UiStateStore'
import { useAppManager } from '../data/hooks/stores/useAppManager'
import { useViewModelStore } from '../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { useLoadNetworkSummaries } from '../data/hooks/useLoadNetworkSummaries'
import { logStartup } from '../debug'
import { fetchUrlCx } from '../models/CxModel/fetchUrlCxUtil'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../models/FilterModel'
import { FilterUrlParams } from '../models/FilterModel/FilterUrlParams'
import { IdType } from '../models/IdType'
import { MessageSeverity } from '../models/MessageModel'
import { GraphObjectType } from '../models/NetworkModel'
import { Panel } from '../models/UiModel/Panel'
import { PanelState } from '../models/UiModel/PanelState'
import { NetworkView } from '../models/ViewModel'
import { AppManagerCommandsProvider } from './AppManager/AppManagerCommandsContext'
import { SelectionStates } from './FloatingToolBar/ShareNetworkButton'
import { DEFAULT_FILTER_NAME } from './HierarchyViewer/components/FilterPanel/FilterPanel'
import { SyncTabsAction } from './SyncTabs'
import { ToolBar } from './ToolBar'

/**
 * Application shell component that provides the main layout structure
 *
 * Responsibilities:
 * - Initializes workspace from database and URL parameters
 * - Handles network import from URL path and query parameters
 * - Restores UI state from URL search parameters (panels, filters, selections)
 * - Manages workspace state and network summaries
 * - Provides layout structure with toolbar and content area
 *
 * The actual workspace editor content is rendered by React Router via <Outlet />
 */
const AppShell = (): ReactElement => {
  const appManagerCommands = useAppManager()
  const params = useParams()
  const navigate = useNavigate()
  const [search, setSearchParams] = useSearchParams()

  const addMessage = useMessageStore((state) => state.addMessage)
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const location: Location = useLocation()
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
  const loadNetworkSummaries = useLoadNetworkSummaries()
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const setUi = useUiStateStore((state) => state.setUi)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )

  const addNewNetwork = useNetworkStore((state) => state.add)
  const setVisualStyle = useVisualStyleStore((state) => state.add)
  const setViewModel = useViewModelStore((state) => state.add)
  const setTables = useTableStore((state) => state.add)
  const addSummaries = useNetworkSummaryStore((state) => state.addAll)
  const addFilterConfig = useFilterStore((state) => state.addFilterConfig)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setActiveTableBrowserIndex = useUiStateStore(
    (state) => state.setActiveTableBrowserIndex,
  )
  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const setNetworkViewTabIndex = useUiStateStore(
    (state) => state.setNetworkViewTabIndex,
  )
  const initialized = useRef(false)

  /**
   * Restores node and edge selection states from URL search parameters
   * Uses retry logic to wait for the view model to be created (networks are loaded asynchronously)
   * @param networkId - The network ID to restore selections for
   */
  const restoreSelectionStates = (networkId: string): void => {
    const selectedNodeStr = search.get(SelectionStates.SelectedNodes) ?? ''
    const selectedEdgeStr = search.get(SelectionStates.SelectedEdges) ?? ''

    if (selectedNodeStr === '' && selectedEdgeStr === '') {
      return
    }

    const selectedNodes: string[] = selectedNodeStr.split(' ')
    const selectedEdges: string[] = selectedEdgeStr.split(' ')

    // Get view model store to check if view model exists
    const getViewModel: (id: IdType) => NetworkView | undefined =
      useViewModelStore.getState().getViewModel

    // Retry logic: wait for view model to be created (networks are loaded asynchronously)
    const tryRestoreSelection = (retryCount: number = 0): void => {
      const MAX_RETRIES = 10
      const RETRY_DELAY_MS = 500

      const viewModel = getViewModel(networkId)
      if (viewModel !== undefined) {
        // View model exists, restore selection
        exclusiveSelect(networkId, selectedNodes, selectedEdges)
      } else if (retryCount < MAX_RETRIES) {
        // View model doesn't exist yet, retry after delay
        setTimeout(() => {
          tryRestoreSelection(retryCount + 1)
        }, RETRY_DELAY_MS)
      }
    }

    tryRestoreSelection()
  }

  /**
   * Restores filter configuration from URL search parameters
   * Creates a filter config if FILTER_FOR, FILTER_BY, and FILTER_RANGE are present
   */
  const restoreFilterStates = (): void => {
    const filterFor = search.get(FilterUrlParams.FILTER_FOR)
    const filterBy = search.get(FilterUrlParams.FILTER_BY)
    const filterRange = search.get(FilterUrlParams.FILTER_RANGE)

    if (filterFor != null && filterBy != null && filterRange != null) {
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
        displayMode: DisplayMode.SELECT,
      }
      addFilterConfig(filterConfig)
    }
  }

  /**
   * Restores the active table browser tab index from URL search parameters
   */
  const restoreTableBrowserTabState = (): void => {
    const tableBrowserTab = search.get('activeTableBrowserTab')

    if (tableBrowserTab != null) {
      setActiveTableBrowserIndex(Number(tableBrowserTab))
    }
  }

  /**
   * Restores the active network view tab index from URL search parameters
   */
  const restoreNetworkViewTabState = (): void => {
    const networkViewTab = search.get('activeNetworkViewTab')

    if (networkViewTab != null) {
      const tabIndex = Number(networkViewTab)
      if (!isNaN(tabIndex) && tabIndex >= 0) {
        setNetworkViewTabIndex(tabIndex)
      }
    }
  }

  /**
   * Restores the active network view from URL search parameters
   * Uses a delay to ensure components are ready before restoring
   */
  const restoreActiveNetworkView = (): void => {
    const activeNetworkView = search.get('activeNetworkView')
    if (activeNetworkView != null) {
      setActiveNetworkView(activeNetworkView)
    }
  }

  /**
   * Restores subnetwork node and edge selection states from URL search parameters
   * Only works if activeNetworkView parameter is defined
   * Uses retry logic to wait for the subnetwork view model to be created
   * @param activeNetworkViewId - The active network view ID to restore selections for
   */
  const restoreSubnetworkSelectionStates = (
    activeNetworkViewId: string,
  ): void => {
    const selectedSubnetworkNodesStr =
      search.get('selectedSubnetworkNodes') ?? ''
    const selectedSubnetworkEdgesStr =
      search.get('selectedSubnetworkEdges') ?? ''

    if (
      selectedSubnetworkNodesStr === '' &&
      selectedSubnetworkEdgesStr === ''
    ) {
      return
    }

    const selectedNodes: string[] =
      selectedSubnetworkNodesStr === ''
        ? []
        : selectedSubnetworkNodesStr.split(' ')
    const selectedEdges: string[] =
      selectedSubnetworkEdgesStr === ''
        ? []
        : selectedSubnetworkEdgesStr.split(' ')

    // Get view model store to check if view model exists
    const getViewModel: (id: IdType) => NetworkView | undefined =
      useViewModelStore.getState().getViewModel

    // Retry logic: wait for view model to be created (subnetworks are created dynamically)
    const tryRestoreSelection = (retryCount: number = 0): void => {
      const MAX_RETRIES = 10
      const RETRY_DELAY_MS = 500

      const viewModel = getViewModel(activeNetworkViewId)
      if (viewModel !== undefined) {
        // View model exists, restore selection
        exclusiveSelect(activeNetworkViewId, selectedNodes, selectedEdges)
      } else if (retryCount < MAX_RETRIES) {
        // View model doesn't exist yet, retry after delay
        setTimeout(() => {
          tryRestoreSelection(retryCount + 1)
        }, RETRY_DELAY_MS)
      }
    }

    tryRestoreSelection()
  }

  useEffect(() => {
    /**
     * Initializes the application shell by:
     * 1. Loading workspace and network summaries from database
     * 2. Processing URL parameters for network imports and UI state
     * 3. Restoring UI state from URL search parameters
     * 4. Navigating to the appropriate workspace/network route
     */
    const initializeAppShell = async () => {
      // Load workspace, summaries, and authentication token
      const workspace = await getWorkspaceFromDb()
      const token = await getToken()
      const summaries = await loadNetworkSummaries(workspace.networkIds, token)

      // Process UI state parameters from search params
      // Update the workspace, uiState and summaries in the stores so react can start to render the workspace editor
      // Create a mutable copy to avoid read-only errors when object comes from IndexedDB
      const dbUiState = await getUiStateFromDb()
      const uiState = dbUiState
        ? cloneDeep(dbUiState)
        : cloneDeep({ ...DEFAULT_UI_STATE })
      uiState.panels[Panel.LEFT] =
        (search.get(Panel.LEFT) as PanelState) ?? uiState.panels[Panel.LEFT]
      uiState.panels[Panel.RIGHT] =
        (search.get(Panel.RIGHT) as PanelState) ?? uiState.panels[Panel.RIGHT]
      uiState.panels[Panel.BOTTOM] =
        (search.get(Panel.BOTTOM) as PanelState) ?? uiState.panels[Panel.BOTTOM]
      uiState.tableUi.activeTabIndex =
        search.get('activeTableBrowserTab') != null
          ? Number(search.get('activeTableBrowserTab'))
          : uiState.tableUi.activeTabIndex
      setUi(uiState)

      // Update the workspace, uiState and summaries in the stores so react can start to render the workspace editor

      // Handle importing networks from URL
      // Two import methods:
      // 1. From URL path: /:workspaceId/networks/:networkId
      // 2. From query params: /...?import=https://example.com/network.cx
      const { networkId } = params
      const isNetworkIdInUrl = networkId !== undefined && networkId !== ''
      const isNetworkIdNotInWorkspace =
        isNetworkIdInUrl && !workspace.networkIds.includes(networkId)

      const importErrorMessages: string[] = []

      if (isNetworkIdNotInWorkspace) {
        // Check if the network exists in NDEx
        const newNetworkSummary = (
          await fetchNdexSummaries(networkId, token)
        )?.[0]

        if (newNetworkSummary !== undefined) {
          summaries[networkId] = newNetworkSummary
          workspace.currentNetworkId = networkId
          workspace.networkIds.push(networkId)
        } else {
          importErrorMessages.push(
            `Unable to import network ${networkId} from ${location.pathname}. ${networkId} does not exist in NDEx`,
          )
        }
      }
      // Note: If network is already in workspace, we use the existing network
      // Future enhancement: Check if network has been updated in NDEx and prompt user to update

      // Handle import network from search params (e.g., ?import=https://example.com/network.cx)
      const IMPORT_QUERY_KEY = 'import'
      const importUrls = search.getAll(IMPORT_QUERY_KEY)
      const MAX_NETWORK_FILE_SIZE = 10000000 // 10MB limit for URL imports

      for (const importUrl of importUrls) {
        try {
          const fetchResult = await fetchUrlCx(importUrl, MAX_NETWORK_FILE_SIZE)
          const { cyNetwork, summary } = fetchResult
          const {
            network,
            nodeTable,
            edgeTable,
            visualStyle,
            networkViews,
            visualStyleOptions,
          } = cyNetwork
          const importedNetworkId = network.id

          summaries[importedNetworkId] = summary
          await putNetworkSummaryToDb(summary)
          workspace.currentNetworkId = importedNetworkId
          workspace.networkIds.push(importedNetworkId)

          // Note: Store operations assume the updated network is the current network
          // Therefore, we set the current network ID before updating stores
          setVisualStyleOptions(importedNetworkId, visualStyleOptions)
          addNewNetwork(network)
          setVisualStyle(importedNetworkId, visualStyle)
          setTables(importedNetworkId, nodeTable, edgeTable)
          setViewModel(importedNetworkId, networkViews[0])
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          importErrorMessages.push(
            `Unable to import network from query params at url ${importUrl}.`,
            `Error: ${errorMessage}`,
          )
        }
      }

      if (importErrorMessages.length > 0) {
        addMessage({
          message: importErrorMessages.join('\n'),
          persistent: true,
          severity: MessageSeverity.ERROR,
        })
      }

      addSummaries(summaries)
      setWorkspace(workspace)

      // Initialize event bus after workspace is hydrated so store subscriptions
      // do not fire spurious network:created / network:switched events on startup.
      // cywebapi:ready signals external consumers that the API and event bus are ready.
      initEventBus()
      window.dispatchEvent(new CustomEvent('cywebapi:ready'))

      // Process state restoration parameters after workspace is set
      const hasSearchQueryParams = search.size > 0
      if (hasSearchQueryParams) {
        // Restore state parameters from URL
        restoreSelectionStates(workspace.currentNetworkId)
        restoreTableBrowserTabState()
        restoreNetworkViewTabState()
        restoreFilterStates()

        // Restore active network view and subnetwork selection with a delay to ensure components are ready
        const activeNetworkViewId = search.get('activeNetworkView')
        const NETWORK_VIEW_RESTORE_DELAY_MS = 1000
        setTimeout(() => {
          restoreActiveNetworkView()

          // Restore subnetwork selection after activeNetworkView is set and components are ready
          if (activeNetworkViewId != null) {
            restoreSubnetworkSelectionStates(activeNetworkViewId)
          }
        }, NETWORK_VIEW_RESTORE_DELAY_MS)
      }

      // Navigate to the workspace/network route, clearing search params after processing
      navigate(
        {
          pathname: `/${workspace.id}/networks/${workspace.currentNetworkId}`,
          search: '',
        },
        {
          replace: true,
        },
      )
    }

    if (!initialized.current) {
      initialized.current = true
      logStartup.info('[AppShell]: Initializing app shell')
      initializeAppShell()
    }
  }, [])

  return (
    <AppManagerCommandsProvider value={appManagerCommands}>
      <Box
        data-testid="app-shell"
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          boxSizing: 'border-box',
          flexDirection: 'column',
        }}
      >
        <Box data-testid="app-shell-toolbar-container" sx={{ p: 0, margin: 0 }}>
          <ToolBar />
        </Box>
        <Box
          data-testid="app-shell-content-container"
          sx={{ flexGrow: 1, height: '100%', p: 0, margin: 0 }}
        >
          <Outlet />
        </Box>
        <SyncTabsAction />
      </Box>
    </AppManagerCommandsProvider>
  )
}

export default AppShell
