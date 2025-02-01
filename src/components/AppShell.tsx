import { Box } from '@mui/material'
import {
  Location,
  Outlet,
  useLocation,
  useNavigate,
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
import { WarningDialog } from './ExternalLoading/WarningDialog'
import { DEFAULT_UI_STATE, useUiStateStore } from '../store/UiStateStore'
import { AppConfigContext } from '../AppConfigContext'
import {
  useNdexNetworkSummary,
  ndexSummaryFetcher,
} from '../store/hooks/useNdexNetworkSummary'
import { useCredentialStore } from '../store/CredentialStore'

import { UpdateNetworkDialog } from './UpdateNetworkDialog'
import { waitSeconds } from '../utils/wait-seconds'
import { PanelState } from '../models/UiModel/PanelState'
import { Panel } from '../models/UiModel/Panel'
import { Workspace } from '../models/WorkspaceModel'
import { SyncTabsAction } from './SyncTabs'

import { useMessageStore } from '../store/MessageStore'
import { MessageSeverity } from '../models/MessageModel'
import { fetchUrlCx } from '../models/CxModel/fetch-url-cx-util'
import { useNetworkStore } from '../store/NetworkStore'
import { useTableStore } from '../store/TableStore'
import { useViewModelStore } from '../store/ViewModelStore'
import { useVisualStyleStore } from '../store/VisualStyleStore'
import { useNetworkSummaryStore } from '../store/NetworkSummaryStore'

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
  const [initializationError, setInitializationError] = useState<string>('')

  // This is necessary to prevent creating a new workspace on every render
  const [showDialog, setShowDialog] = useState<boolean>(false)
  const [search, setSearch] = useSearchParams()

  const addMessage = useMessageStore((state) => state.addMessage)
  const resetMessage = useMessageStore((state) => state.resetMessages)

  const initializedRef = useRef(false)

  // Keep track of the network ID in the URL
  const urlNetIdRef = useRef<string>('')

  const navigate = useNavigate()
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const location: Location = useLocation()
  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)
  const errorMessageInStore = useUiStateStore((state) => state.ui.errorMessage)

  useEffect(() => {
    if (errorMessageInStore !== undefined && errorMessageInStore !== '') {
      setInitializationError(errorMessageInStore)
      setShowErrorDialog(true)
      setErrorMessage('')
    }
  }, [errorMessageInStore])

  const setUi = useUiStateStore((state) => state.setUi)
  const setVisualStyleOptions = useUiStateStore(
    (state) => state.setVisualStyleOptions,
  )
  // const { showErrorDialog } = useUiStateStore((state) => state.ui)
  const setShowErrorDialog = useUiStateStore(
    (state) => state.setShowErrorDialog,
  )

  const addSummary = useNetworkSummaryStore((state) => state.add)

  const addNewNetwork = useNetworkStore((state) => state.add)

  const setVisualStyle = useVisualStyleStore((state) => state.add)

  const setViewModel = useViewModelStore((state) => state.add)

  const setTables = useTableStore((state) => state.add)

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const client = useCredentialStore((state) => state.client)

  const authenticated = client?.authenticated ?? false
  const { id, currentNetworkId, networkIds, networkModified } = workspace

  // const parsed = parsePathName(location.pathname)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

  const setActiveTableBrowserIndex = useUiStateStore(
    (state) => state.setActiveTableBrowserIndex,
  )
  /**
   * Initializing assigned workspace for this session
   */
  const setupWorkspace = (): void => {
    const parsed: ParsedUrlParams = parsePathName(location.pathname)

    const { workspaceId, networkId } = parsed
    urlNetIdRef.current = networkId

    // Check location and curren workspace ID
    if (id === '') {
      // No workspace ID is set
      // Check if the URL has workspace ID

      let targetWorkspaceId: string = workspaceId

      // TODO: URL design should be consolidated as constants
      if (targetWorkspaceId === 'network') {
        // Special case: network import
        targetWorkspaceId = ''
      }

      void getWorkspaceFromDb(
        targetWorkspaceId === '' ? undefined : targetWorkspaceId,
      ).then((workspace: Workspace) => {
        // Add error message if the new workspace ID is not same as the one in URL
        if (
          targetWorkspaceId !== workspace.id &&
          targetWorkspaceId !== '' &&
          targetWorkspaceId !== DUMMY_WS_ID
        ) {
          setErrorMessage(
            `An invalid workspace ID was entered (${targetWorkspaceId}). 
            Your workspace has now been initialized with the last cache.`,
          )
        }
        setWorkspace(workspace)
      })
    }
  }

  const loadUiState = (): Promise<void> => {
    return getUiStateFromDb().then((uiState) => {
      if (uiState !== undefined) {
        setUi(uiState)
      } else {
        setUi(DEFAULT_UI_STATE)
      }
    })
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
   * Once this component is initialized, check the workspace ID
   */
  useEffect(() => {
    const initializeWorkspace = async (): Promise<void> => {
      try {
        await initializeDb()
        setupWorkspace()
        await loadUiState()
        restorePanelStates()
        restoreTableBrowserTabState()
      } catch (error) {
        throw new Error(`Failed to initialize the workspace: ${error.message}`)
      } finally {
        // initializedRef.current = true
      }
    }

    // Use this flag to prevent creating a new workspace more than once
    if (!initializedRef.current) {
      initializedRef.current = true
      initializeWorkspace()
    }
  }, [])

  const redirect = async (): Promise<void> => {
    // clear all messages
    resetMessage()

    if (!initializedRef.current || id === '') return

    // const parsed = parsePathName(location.pathname)
    const parsedNetworkId = urlNetIdRef.current

    // At this point, workspace ID is always available
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      // ID from the URL parameter
      if (parsedNetworkId !== '' && parsedNetworkId !== undefined) {
        addNetworkIds(parsedNetworkId)
        setCurrentNetworkId(parsedNetworkId)
        navigate(
          `/${id}/networks/${parsedNetworkId}${location.search.toString()}`,
        )
      } else if (networkIds.length > 0) {
        // Case 1: Current network is not available
        // Pick the first one if network is in the workspace
        navigate(
          `/${id}/networks/${networkIds[0]}${location.search.toString()}`,
        )
      } else {
        // Otherwise, display empty page
        navigate(`/${id}/networks${location.search.toString()}`)
      }
    } else {
      // This is the network ID in the URL, not yet set as the current network ID
      // No network ID in the URL --> redirect to the current network
      const networkId: string = parsedNetworkId
      if (networkId === '' || networkId === undefined) {
        navigate(
          `/${id}/networks/${currentNetworkId}${location.search.toString()}`,
        )
      } else if (networkIds.includes(networkId)) {
        // the user is trying to load a network that is already in the workspace
        // check that if they have an outdated version of the network by comparing modification times
        // of the local copy and the ndex summary
        try {
          const token = await getToken()
          const summaryMap = await useNdexNetworkSummary(
            networkId,
            ndexBaseUrl,
            token,
          )
          const networkSummary = summaryMap[networkId]
          const ndexSummaries = await ndexSummaryFetcher(
            networkId,
            ndexBaseUrl,
            token,
          )
          const ndexSummary = ndexSummaries?.[0]
          const localNetworkOutdated =
            networkSummary?.modificationTime !== undefined &&
            ndexSummary?.modificationTime !== undefined &&
            networkSummary?.modificationTime < ndexSummary?.modificationTime

          const localNetworkModified = networkModified[networkId] ?? false
          if (localNetworkOutdated) {
            if (localNetworkModified && authenticated) {
              // local network and ndex network have been modified and the user is authenticated
              // ask the user what they want to do
              setShowDialog(true)
            } else {
              // the local network has not been modified but it has been modified on NDEx
              // update the network silently
              deleteNetwork(networkId)
              await waitSeconds(2)
              addNetworkIds(networkId)
              await waitSeconds(2)
              setCurrentNetworkId(networkId)
              await waitSeconds(2)
              deleteNetworkModifiedStatus(networkId)

              navigate(
                `/${id}/networks/${networkId}${location.search.toString()}`,
              )
            }
          } else {
            addNetworkIds(networkId)
            setCurrentNetworkId(networkId)
            navigate(
              `/${id}/networks/${networkId}${location.search.toString()}`,
            )
          }
        } catch (error) {
          const errorMessage: string = error.message
          setErrorMessage(
            `Failed to load the network (${networkId}) entered in the URL (${errorMessage}). 
            Please double-check the network ID you entered. 
            Your workspace has now been initialized with the last cache.`,
          )
          setShowErrorDialog(true)
        }
      }
    }
  }

  const handleImportNetworkFromSearchParam = async (): Promise<void> => {
    search.forEach(async (value, key) => {
      if (key === IMPORT_KEY) {
        try {
          const nextParams = new URLSearchParams(search)
          nextParams.delete(IMPORT_KEY)

          setSearch(nextParams)
          const res = await fetchUrlCx(value, 10000000)

          const { networkWithView, summary } = res
          const { network, nodeTable, edgeTable, visualStyle, networkViews } =
            networkWithView
          const newNetworkId = network.id

          addSummary(newNetworkId, summary)

          // TODO the db syncing logic in various stores assumes the updated network is the current network
          // therefore, as a temporary fix, the first operation that should be done is to set the
          // current network to be the new network id

          setVisualStyleOptions(newNetworkId)
          setCurrentNetworkId(newNetworkId)
          addNewNetwork(network)
          setVisualStyle(newNetworkId, visualStyle)
          setTables(newNetworkId, nodeTable, edgeTable)
          setViewModel(newNetworkId, networkViews[0])
          addNetworkToWorkspace(newNetworkId)
        } catch (error) {
          addMessage({
            message: `Failed to import network from url: ${value}`,
            duration: 5000,
            severity: MessageSeverity.ERROR,
          })
        }
      }
    })
  }

  useEffect(() => {
    const handleInit = async () => {
      try {
        await redirect()
      } catch (error) {
        console.error('Failed to redirect', error)
      }

      await handleImportNetworkFromSearchParam()
    }
    // Now workspace ID is set. route to the correct page
    if (id !== '' && initializedRef.current) {
      void handleInit()
    }
  }, [id])

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
      <UpdateNetworkDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
      <WarningDialog
        title="Initialization Error"
        subtitle="Problems during initialization:"
        message={initializationError}
        open={initializationError !== ''}
        handleClose={() => {
          setShowErrorDialog(false)
          setInitializationError('')
        }}
      />
      <SyncTabsAction />
    </Box>
  )
}

export default AppShell
