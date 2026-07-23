import { Box } from '@mui/material'
import cloneDeep from 'lodash/cloneDeep'
import React, { ReactElement, useEffect, useRef, useState } from 'react'
import {
  Location,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { initEventBus } from '../app-api/event-bus/initEventBus'
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
import { useAppStore } from '../data/hooks/stores/AppStore'
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
import { serviceAppUrlsToAdd } from '../models/AppModel/impl'
import { MessageSeverity } from '../models/MessageModel'
import { GraphObjectType } from '../models/NetworkModel'
import { Ui } from '../models/UiModel'
import { Panel } from '../models/UiModel/Panel'
import { PanelState } from '../models/UiModel/PanelState'
import { NetworkView } from '../models/ViewModel'
import { AppManagerCommandsProvider } from './AppManager/AppManagerCommandsContext'
import { parseSingleEntryManifest } from './AppManager/install/installGate'
import { ConfirmationDialog } from './ConfirmationDialog'
import { SelectionStates } from './FloatingToolBar/ShareNetworkButton'
import { DEFAULT_FILTER_NAME } from './HierarchyViewer/components/FilterPanel/FilterPanel'
import { SyncTabsAction } from './SyncTabs'
import { ToolBar } from './ToolBar'

// Search param carrying an App Store install intent: a URL pointing to a
// single-entry manifest (see workspace-app-install-design.md §7.2).
const INSTALL_APP_QUERY_KEY = 'installApp'

// Search param carrying a service-app install intent: one or more URLs of
// external service endpoints to register (CW-521). Adding requires explicit
// user confirmation, since it comes from an arbitrary link.
const ADD_SERVICE_APP_QUERY_KEY = 'addserviceapp'

/**
 * Builds the mount-time UI state by overlaying URL search parameters
 * (panel states, active table browser tab) on the persisted UI state.
 * Encodes the shareable-URL panel semantics; exported for testing.
 */
export const mergeUiStateWithSearchParams = (
  dbUiState: Ui | undefined,
  search: URLSearchParams,
): Ui => {
  // Create a mutable copy to avoid read-only errors when object comes from IndexedDB
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
  return uiState
}

/**
 * Builds a FilterConfig from URL search parameters, or undefined unless
 * FILTER_FOR, FILTER_BY, and FILTER_RANGE are all present.
 * Encodes the shareable-URL filter semantics; exported for testing.
 */
export const buildFilterConfigFromSearchParams = (
  search: URLSearchParams,
): FilterConfig | undefined => {
  const filterFor = search.get(FilterUrlParams.FILTER_FOR)
  const filterBy = search.get(FilterUrlParams.FILTER_BY)
  const filterRange = search.get(FilterUrlParams.FILTER_RANGE)

  if (filterFor == null || filterBy == null || filterRange == null) {
    return undefined
  }

  return {
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
}

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
  const [search] = useSearchParams()

  const addMessage = useMessageStore((state) => state.addMessage)
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const addService = useAppStore((state) => state.addService)

  // Service-app URLs requested via ?addserviceapp=, awaiting user confirmation.
  const [serviceAppsToAdd, setServiceAppsToAdd] = useState<string[]>([])
  const location: Location = useLocation()
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
  const loadNetworkSummaries = useLoadNetworkSummaries()
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
    const filterConfig = buildFilterConfigFromSearchParams(search)
    if (filterConfig !== undefined) {
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

  // One-shot startup effect (URL-as-state pattern): snapshots the mount-time
  // search params / route and hydrates stores exactly once (ref-guarded, also
  // under StrictMode). Re-running with fresh router values is never correct —
  // it would re-import networks and re-navigate after its own URL cleanup.
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
      const dbUiState = await getUiStateFromDb()
      const uiState = mergeUiStateWithSearchParams(dbUiState, search)
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

      // Process an App Store install intent (?installApp=<manifestUrl>). The
      // workspace is hydrated by now (setWorkspace above), so installApp's
      // persisted write is accepted (§8.3). The param is stripped by the
      // navigate() below. Never throws — init must continue regardless.
      const installAppUrl = search.get(INSTALL_APP_QUERY_KEY)
      if (installAppUrl !== null) {
        try {
          const response = await fetch(installAppUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          const data = await response.json()
          const entry = parseSingleEntryManifest(data)
          if (entry === undefined) {
            throw new Error('manifest contained no valid app entry')
          }
          // Install intent implies activation (§7.3). The §9 gate inside
          // installApp still applies (origin allow-list, host compatibility)
          // and surfaces its own messages, so only fetch/parse errors land here.
          await appManagerCommands.installApp(entry, { activate: true })
        } catch (error) {
          addMessage({
            message: `Failed to install app from ${installAppUrl}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
            duration: 5000,
            severity: MessageSeverity.ERROR,
          })
          logStartup.warn(
            `[AppShell]: install intent failed for ${installAppUrl}`,
            error,
          )
        }
      }

      // Process a service-app install intent (?addserviceapp=<endpointUrl>).
      // We only capture the URLs here and prompt for confirmation below; the
      // param is stripped by the navigate() call at the end of init.
      const requestedServiceAppUrls = search.getAll(ADD_SERVICE_APP_QUERY_KEY)
      if (requestedServiceAppUrls.length > 0) {
        const toAdd = serviceAppUrlsToAdd(
          requestedServiceAppUrls,
          useAppStore.getState().serviceApps,
        )
        if (toAdd.length > 0) {
          setServiceAppsToAdd(toAdd)
        }
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-guarded run-once init; snapshots URL state by design
  }, [])

  const handleConfirmAddServiceApps = (): void => {
    const urls = serviceAppsToAdd
    setServiceAppsToAdd([])
    void (async () => {
      for (const url of urls) {
        try {
          await addService(url)
          addMessage({
            message: `Added service app: ${url}`,
            duration: 4000,
            severity: MessageSeverity.SUCCESS,
          })
        } catch (error) {
          addMessage({
            message: `Failed to add service app from ${url}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
            duration: 5000,
            severity: MessageSeverity.ERROR,
          })
          logStartup.warn(
            `[AppShell]: addserviceapp intent failed for ${url}`,
            error,
          )
        }
      }
    })()
  }

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
      <ConfirmationDialog
        open={serviceAppsToAdd.length > 0}
        setOpen={(open) => {
          if (!open) {
            setServiceAppsToAdd([])
          }
        }}
        title="Add service app?"
        message={`This link wants to add the following service app${
          serviceAppsToAdd.length > 1 ? 's' : ''
        } to Cytoscape Web:\n\n${serviceAppsToAdd.join(
          '\n',
        )}\n\nOnly add service apps from sources you trust.`}
        buttonTitle="Add"
        onConfirm={handleConfirmAddServiceApps}
      />
    </AppManagerCommandsProvider>
  )
}

export default AppShell
