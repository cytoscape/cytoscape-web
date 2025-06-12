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
// import { HistoryDebugger } from './Util/HistoryDebugger'

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
  // useEffect(() => {
  //   const originalPushState = history.pushState
  //   const originalReplaceState = history.replaceState

  //   history.pushState = function (...args) {
  //     console.log('🔵 PUSH STATE:', args, new Error().stack)
  //     return originalPushState.apply(this, args)
  //   }

  //   history.replaceState = function (...args) {
  //     console.log('🟡 REPLACE STATE:', args, new Error().stack)
  //     return originalReplaceState.apply(this, args)
  //   }

  //   // Detect browser back/forward button navigation
  //   const handlePopStateDebug = (event: PopStateEvent) => {
  //     console.log('🔴 BROWSER NAVIGATION (Back/Forward):', {
  //       url: window.location.href,
  //       pathname: window.location.pathname,
  //       search: window.location.search,
  //       state: event.state,
  //       timestamp: new Date().toISOString(),
  //     })

  //     // Use if more detailed stack trace is needed
  //     console.trace('🔴 Navigation stack trace')
  //   }

  //   const handleBeforeUnload = () => {
  //     console.log('🟠 PAGE UNLOAD:', window.location.href)
  //   }

  //   // Add event listeners
  //   window.addEventListener('popstate', handlePopStateDebug)
  //   window.addEventListener('beforeunload', handleBeforeUnload)

  //   return () => {
  //     history.pushState = originalPushState
  //     history.replaceState = originalReplaceState
  //     window.removeEventListener('popstate', handlePopStateDebug)
  //     window.removeEventListener('beforeunload', handleBeforeUnload)
  //   }
  // }, [])

  const [initializationError, setInitializationError] = useState<string>('')

  // This is necessary to prevent creating a new workspace on every render
  const [showDialog, setShowDialog] = useState<boolean>(false)
  const [targetNetworkId, setTargetNetworkId] = useState<string>('')
  const [search] = useSearchParams()

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
        // Replace current network ID with the one in the URL.
        // This is necessary to prevent switching to the current network ID in the cache
        if (
          networkId !== undefined &&
          networkId !== '' &&
          networkId !== workspace.currentNetworkId
        ) {
          workspace.currentNetworkId = networkId
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

    const parsedNetworkId = urlNetIdRef.current
    // Clear it only after the network ID has been used for redirection
    setTimeout(() => {
      urlNetIdRef.current = ''
    }, 0)

    // At this point, workspace ID is always available
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      if (parsedNetworkId !== '' && parsedNetworkId !== undefined) {
        addNetworkIds(parsedNetworkId)
        await waitSeconds(1)
        setCurrentNetworkId(parsedNetworkId)
        // Use replace to avoid adding to history
        navigate(
          `/${id}/networks/${parsedNetworkId}${location.search.toString()}`,
          { replace: true },
        )
      } else if (networkIds.length > 0) {
        navigate(
          `/${id}/networks/${networkIds[0]}${location.search.toString()}`,
          { replace: true },
        )
      } else {
        navigate(`/${id}/networks${location.search.toString()}`, {
          replace: true,
        })
      }
    } else {
      const networkId: string = parsedNetworkId
      if (networkId === '' || networkId === undefined) {
        navigate(
          `/${id}/networks/${currentNetworkId}${location.search.toString()}`,
          { replace: true },
        )
      } else {
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
              setTargetNetworkId(networkId)
              setShowDialog(true)
            } else {
              // the local network has not been modified but it has been modified on NDEx
              // update the network silently
              deleteNetwork(networkId)
              await waitSeconds(1)
              addNetworkIds(networkId)
              await waitSeconds(1)
              setCurrentNetworkId(networkId)
              await waitSeconds(1)
              deleteNetworkModifiedStatus(networkId)

              navigate(
                `/${id}/networks/${networkId}${location.search.toString()}`,
                { replace: true },
              )
            }
          } else {
            addNetworkIds(networkId)
            await waitSeconds(1)
            setCurrentNetworkId(networkId)
            navigate(
              `/${id}/networks/${networkId}${location.search.toString()}`,
              { replace: true },
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

    console.log('---------------Finished redirecting------------------')
  }

  const handleImportNetworkFromSearchParam = async (): Promise<void> => {
    search.forEach(async (value, key) => {
      if (key === IMPORT_KEY) {
        try {
          const nextParams = new URLSearchParams(search)
          nextParams.delete(IMPORT_KEY)

          // setSearch(nextParams)
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

  // Store previous location information with ref
  const prevLocationRef = useRef(location)

  // Monitor location changes for debugging
  useEffect(() => {
    console.log('🟢 REACT ROUTER LOCATION CHANGE:', {
      // Current values
      current: {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        key: location.key,
      },
      // Previous values
      previous: {
        pathname: prevLocationRef.current.pathname,
        search: prevLocationRef.current.search,
        hash: prevLocationRef.current.hash,
        state: prevLocationRef.current.state,
        key: prevLocationRef.current.key,
      },
      // Changed items only
      changes: {
        pathname:
          location.pathname !== prevLocationRef.current.pathname
            ? { from: prevLocationRef.current.pathname, to: location.pathname }
            : 'unchanged',
        search:
          location.search !== prevLocationRef.current.search
            ? { from: prevLocationRef.current.search, to: location.search }
            : 'unchanged',
        hash:
          location.hash !== prevLocationRef.current.hash
            ? { from: prevLocationRef.current.hash, to: location.hash }
            : 'unchanged',
      },
      timestamp: new Date().toISOString(),
    })

    // Save current values as previous values
    prevLocationRef.current = location
  }, [location])

  // Network ID synchronization process
  useEffect(() => {
    // If location network ID differs from currentNetworkId, set location value as current network
    const parsed = parsePathName(location.pathname)
    const { networkId: locationNetworkId } = parsed

    if (
      locationNetworkId &&
      locationNetworkId !== '' &&
      locationNetworkId !== currentNetworkId &&
      id !== '' // Only when workspace is initialized
    ) {
      console.log('🔄 Setting current network ID from location:', {
        from: currentNetworkId,
        to: locationNetworkId,
        timestamp: new Date().toISOString(),
      })

      // Add network to workspace if it doesn't exist yet
      if (!networkIds.includes(locationNetworkId)) {
        console.log('Adding network to workspace:', locationNetworkId)
        addNetworkIds(locationNetworkId)
      }

      // Update current network ID (with duplicate check)
      if (currentNetworkId !== locationNetworkId) {
        console.log('Updating current network ID:', locationNetworkId)
        setCurrentNetworkId(locationNetworkId)
      }
    }
  }, [location, id, networkIds])

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
        networkId={targetNetworkId}
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
      {/* History debugger - only show in development */}
      {/* {process.env.NODE_ENV === 'development' && <HistoryDebugger />} */}
    </Box>
  )
}

export default AppShell
