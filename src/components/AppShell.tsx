import { Box } from '@mui/material'
import {
  Location,
  Outlet,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useState, ReactElement, useEffect, useRef, useContext } from 'react'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import {
  getUiStateFromDb,
  getWorkspaceFromDb,
  initializeDb,
} from '../store/persist/db'

import { ToolBar } from './ToolBar'
import { ParsedUrlParams, parsePathName } from '../utils/paths-util'
import { WarningDialog } from './WarningDialog'
import { DEFAULT_UI_STATE, useUiStateStore } from '../store/UiStateStore'
import { AppConfigContext } from '../AppConfigContext'
import {
  getSummariesFromCacheOrNdex,
  ndexSummaryFetcher,
} from '../store/getNetworkSummaryFromCacheOrNdex'
import { useCredentialStore } from '../store/CredentialStore'

import { UpdateNetworkDialog } from './UpdateNetworkDialog'
import { waitSeconds } from '../utils/wait-seconds'
import { PanelState } from '../models/UiModel/PanelState'
import { Panel } from '../models/UiModel/Panel'
import { Workspace } from '../models/WorkspaceModel'
import { SyncTabsAction } from './SyncTabs'
// import { HistoryDebugger } from './Util/HistoryDebugger'

import { useMessageStore } from '../store/MessageStore'
import { MessageSeverity } from '../models/MessageModel'
import { fetchUrlCx } from '../models/CxModel/fetch-url-cx-util'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'
import { useUrlNavigation } from '../store/hooks/useUrlNavigation/useUrlNavigation'
import { logStartup, logUi } from '../debug'

// This is a valid workspace ID for sharing
const DUMMY_WS_ID = '0'

const IMPORT_KEY = 'import'

/**
 *
 * Empty application shell only with a toolbar
 *
 *  - Actual contents will be rendered by the router
 *
 */
const AppShell = (): ReactElement => {
  const params = useParams()

  const [search, setSearchParams] = useSearchParams()

  const addMessage = useMessageStore((state) => state.addMessage)
  const { navigateToNetwork } = useUrlNavigation()
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const location: Location = useLocation()
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
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

  useEffect(() => {
    const init = async () => {
      // Load workspace, summaries in the workspace and authentication token
      const workspace = await getWorkspaceFromDb()
      const token = await getToken()
      const summaries = await getSummariesFromCacheOrNdex(
        workspace.networkIds,
        ndexBaseUrl,
        token,
      )

      // Process UI state parameters from search params
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

      // Handle importing networks from
      // /:workspaceId/networks/:networkId
      // /...?import=...
      // 1. Handle import network from url e.g. /:workspaceId/networks/:networkId
      const { networkId } = params
      const networkIdNonEmpty = networkId !== undefined && networkId !== ''
      const networkIdNotInWorkspace =
        networkIdNonEmpty && !workspace.networkIds.includes(networkId)

      const unableToImportNetworkMessages = []

      if (networkIdNotInWorkspace) {
        // Check if the network is in the cache or NDEx
        const newNetworkSummary = (
          await ndexSummaryFetcher(networkId, ndexBaseUrl, token)
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

      // 2. Handle import network from search params e.g. /...?import=...
      search.forEach(async (value, key) => {
        if (key === IMPORT_KEY) {
          try {
            // setSearch(nextParams)
            const res = await fetchUrlCx(value, 10000000)

            const { networkWithView, summary } = res
            const { network, nodeTable, edgeTable, visualStyle, networkViews } =
              networkWithView
            const newNetworkId = network.id
            summaries[newNetworkId] = summary
            workspace.currentNetworkId = newNetworkId
            workspace.networkIds.push(newNetworkId)

            // TODO the db syncing logic in various stores assumes the updated network is the current network
            // therefore, as a temporary fix, the first operation that should be done is to set the
            // current network to be the new network id

            setVisualStyleOptions(newNetworkId)
            addNewNetwork(network)
            setVisualStyle(newNetworkId, visualStyle)
            setTables(newNetworkId, nodeTable, edgeTable)
            setViewModel(newNetworkId, networkViews[0])
          } catch (error) {
            unableToImportNetworkMessages.push(
              `Unable to import network from query params. Could not fetch network from url ${value}.`,
            )
          }
        }
      })

      if (unableToImportNetworkMessages.length > 0) {
        addMessage({
          message: unableToImportNetworkMessages.join('\n'),
          duration: 5000,
          severity: MessageSeverity.ERROR,
        })
      }

      // Update the workspace, uiState and summaries in the stores so react can start to render the workspace editor
      setUi(uiState)
      addSummaries(summaries)
      setWorkspace(workspace)
      // From '/', navigate to /:workspaceId/networks/:networkId
      navigateToNetwork({
        workspaceId: workspace.id,
        networkId: workspace.currentNetworkId,
        searchParams: new URLSearchParams(location.search),
        replace: true,
      })
    }

    init()
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
      {/* <SyncTabsAction /> */}
    </Box>
  )
}

export default AppShell
