import { Box } from '@mui/material'
import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
import {
  Location,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { fetchNdexSummaries } from '../api/ndex'
import { AppConfigContext } from '../AppConfigContext'
import {
  getUiStateFromDb,
  getWorkspaceFromDb,
  putNetworkSummaryToDb,
} from '../db/'
import { logStartup } from '../debug'
import { useCredentialStore } from '../hooks/stores/CredentialStore'
import { useFilterStore } from '../hooks/stores/FilterStore'
import { useMessageStore } from '../hooks/stores/MessageStore'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { DEFAULT_UI_STATE, useUiStateStore } from '../hooks/stores/UiStateStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'
import { useLoadNetworkSummaries } from '../hooks/useLoadNetworkSummaries'
import { fetchUrlCx } from '../models/CxModel/fetchUrlCxUtil'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../models/FilterModel'
import { FilterUrlParams } from '../models/FilterModel/FilterUrlParams'
import { MessageSeverity } from '../models/MessageModel'
import { GraphObjectType } from '../models/NetworkModel'
import { Panel } from '../models/UiModel/Panel'
import { PanelState } from '../models/UiModel/PanelState'
import { SelectionStates } from './FloatingToolBar/ShareNetworkButton'
import { DEFAULT_FILTER_NAME } from './HierarchyViewer/components/FilterPanel/FilterPanel'
import { SyncTabsAction } from './SyncTabs'
import { ToolBar } from './ToolBar'

/**
 *
 * Empty application shell only with a toolbar
 *
 *  - Actual contents will be rendered by the router
 *
 */
const AppShell = (): ReactElement => {
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
  const initialized = useRef(false)

  /**
   * Restore the node / edge selection states from URL
   */
  const restoreSelectionStates = (networkId: string): void => {
    const selectedNodeStr = search.get(SelectionStates.SelectedNodes) ?? ''
    const selectedEdgeStr = search.get(SelectionStates.SelectedEdges) ?? ''

    if (selectedNodeStr === '' && selectedEdgeStr === '') {
      return
    }

    const selectedNodes: string[] = selectedNodeStr.split(' ')
    const selectedEdges: string[] = selectedEdgeStr.split(' ')
    exclusiveSelect(networkId, selectedNodes, selectedEdges)
  }

  /**
   * Restore filter states from URL
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
        displayMode: DisplayMode.SHOW_HIDE,
      }
      addFilterConfig(filterConfig)
    }
  }

  const restoreTableBrowserTabState = (): void => {
    const tableBrowserTab = search.get('activeTableBrowserTab')

    if (tableBrowserTab != null) {
      setActiveTableBrowserIndex(Number(tableBrowserTab))
    }
  }

  const restoreActiveNetworkView = (): void => {
    const activeNetworkView = search.get('activeNetworkView')
    if (activeNetworkView != null) {
      setActiveNetworkView(activeNetworkView)
    }
  }

  useEffect(() => {
    const init = async () => {
      // Load workspace, summaries in the workspace and authentication token
      const workspace = await getWorkspaceFromDb()
      const token = await getToken()
      const summaries = await loadNetworkSummaries(workspace.networkIds, token)

      // Process UI state parameters from search params
      // Update the workspace, uiState and summaries in the stores so react can start to render the workspace editor
      const uiState = (await getUiStateFromDb()) ?? DEFAULT_UI_STATE
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

      // Handle importing networks from NDEx
      // /:workspaceId/networks/:networkId
      // /...?import=...
      // 1. Handle import network from url e.g. /:workspaceId/networks/:networkId
      const { networkId } = params
      const networkIdNonEmpty = networkId !== undefined && networkId !== ''
      const networkIdNotInWorkspace =
        networkIdNonEmpty && !workspace.networkIds.includes(networkId)

      const unableToImportNetworkMessages = []

      if (networkIdNotInWorkspace) {
        // Check if the network is in NDEx
        const newNetworkSummary = (
          await fetchNdexSummaries(networkId, token)
        )?.[0]

        if (newNetworkSummary !== undefined) {
          summaries[networkId] = newNetworkSummary
          workspace.currentNetworkId = networkId
          workspace.networkIds.push(networkId)
        } else {
          unableToImportNetworkMessages.push(
            `Unable to import network ${networkId} from ${location.pathname}. ${networkId} does not exist in NDEx`,
          )
        }
      } else {
        // TODO: handle network found in workspace
        // Prompt the user to update the network if it is from NDEx and it has been updated in NDEx
        // promptUserToUpdateNetwork()
      }

      // 2. Handle import network from search params
      // find all key value search params with key = import. e.g. /...?import=...
      const IMPORT_KEY = 'import'
      const importValues = search.getAll(IMPORT_KEY)
      for (const value of importValues) {
        try {
          const res = await fetchUrlCx(value, 10000000)
          const { networkWithView, summary } = res
          const {
            network,
            nodeTable,
            edgeTable,
            visualStyle,
            networkViews,
            visualStyleOptions,
          } = networkWithView
          const newNetworkId = network.id
          summaries[newNetworkId] = summary
          await putNetworkSummaryToDb(summary)
          workspace.currentNetworkId = newNetworkId
          workspace.networkIds.push(newNetworkId)

          // TODO the db syncing logic in various stores assumes the updated network is the current network
          // therefore, as a temporary fix, the first operation that should be done is to set the
          // current network to be the new network id

          setVisualStyleOptions(newNetworkId, visualStyleOptions)
          addNewNetwork(network)
          setVisualStyle(newNetworkId, visualStyle)
          setTables(newNetworkId, nodeTable, edgeTable)
          setViewModel(newNetworkId, networkViews[0])
        } catch (error) {
          unableToImportNetworkMessages.push(
            `Unable to import network from query params at url ${value}.`,
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      }

      if (unableToImportNetworkMessages.length > 0) {
        addMessage({
          message: unableToImportNetworkMessages.join('\n'),
          persistent: true,
          severity: MessageSeverity.ERROR,
        })
      }

      addSummaries(summaries)
      setWorkspace(workspace)

      // Process state restoration parameters after workspace is set
      const hasSearchQueryParams = search.size > 0
      if (hasSearchQueryParams) {
        // Restore state parameters
        restoreSelectionStates(workspace.currentNetworkId)
        restoreTableBrowserTabState()
        restoreFilterStates()

        // Restore active network view with a delay to ensure components are ready
        setTimeout(() => {
          restoreActiveNetworkView()
        }, 1000)
      }

      // From '/', navigate to /:workspaceId/networks/:networkId
      navigate(
        {
          pathname: `/${workspace.id}/networks/${workspace.currentNetworkId}`,
          search: '', // Clear search params after processing
        },
        {
          replace: true,
        },
      )
    }

    if (!initialized.current) {
      initialized.current = true
      logStartup.info('[AppShell]: Initializing app shell')
      init()
    }
  }, [])

  // const promptUserToUpdateNetwork = async (): Promise<void> => {
  //           try {
  //       const token = await getToken()
  //       const summaryMap = await getSummariesFromCacheOrNdex(
  //         networkId,
  //         ndexBaseUrl,
  //         token,
  //       )
  //       const networkSummary = summaryMap[networkId]
  //       const ndexSummaries = await ndexSummaryFetcher(
  //         networkId,
  //         ndexBaseUrl,
  //         token,
  //       )
  //       const ndexSummary = ndexSummaries?.[0]
  //       const localNetworkOutdated =
  //         networkSummary?.modificationTime !== undefined &&
  //         ndexSummary?.modificationTime !== undefined &&
  //         networkSummary?.modificationTime < ndexSummary?.modificationTime

  //       const localNetworkModified = networkModified[networkId] ?? false
  //       if (localNetworkOutdated) {
  //         if (localNetworkModified && authenticated) {
  //           // local network and ndex network have been modified and the user is authenticated
  //           // ask the user what they want to do
  //           setTargetNetworkId(networkId)
  //           setShowDialog(true)
  //         } else {
  //           // the local network has not been modified but it has been modified on NDEx
  //           // update the network silently
  //           deleteNetwork(networkId)
  //           await waitSeconds(1)
  //           addNetworkIds(networkId)
  //           await waitSeconds(1)
  //           setCurrentNetworkId(networkId)
  //           await waitSeconds(1)
  //           deleteNetworkModifiedStatus(networkId)

  //           navigateToNetwork({
  //             workspaceId: id,
  //             networkId: networkId,
  //             searchParams: new URLSearchParams(location.search),
  //             replace: true,
  //           })
  //         }
  //       } else {
  //         addNetworkIds(networkId)
  //         await waitSeconds(1)
  //         setCurrentNetworkId(networkId)
  //         navigateToNetwork({
  //           workspaceId: id,
  //           networkId: networkId,
  //           searchParams: new URLSearchParams(location.search),
  //           replace: true,
  //         })
  //       }
  //     } catch (error) {
  //       const errorMessage: string = error.message
  //       setErrorMessage(
  //         `Failed to load the network (${networkId}) entered in the URL (${errorMessage}).
  //         Please double-check the network ID you entered.
  //         Your workspace has now been initialized with the last cache.`,
  //       )
  //       setShowErrorDialog(true)
  //     }
  //   }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        boxSizing: 'border-box',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 0, margin: 0 }}>
        <ToolBar />
      </Box>
      <Box sx={{ flexGrow: 1, height: '100%', p: 0, margin: 0 }}>
        <Outlet />
      </Box>
      {/* <UpdateNetworkDialog
        open={showDialog}
        networkId={targetNetworkId}
        onClose={() => setShowDialog(false)}
      /> */}
      <SyncTabsAction />
    </Box>
  )
}

export default AppShell
