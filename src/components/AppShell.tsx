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
import { parsePathName } from '../utils/paths-util'
import { WarningDialog } from './ExternalLoading/WarningDialog'
import { DEFAULT_UI_STATE, useUiStateStore } from '../store/UiStateStore'
import { AppConfigContext } from '../AppConfigContext'
import {
  useNdexNetworkSummary,
  networkSummaryFetcher,
} from '../store/hooks/useNdexNetworkSummary'
import { useCredentialStore } from '../store/CredentialStore'

import { UpdateNetworkDialog } from './UpdateNetworkDialog'
import { waitSeconds } from '../utils/wait-seconds'
import { PanelState } from '../models/UiModel/PanelState'
import { Panel } from '../models/UiModel/Panel'

/**
 *
 * Empty application shell only with a toolbar
 *
 *  - Actual contents will be rendered by the router
 *
 */
const AppShell = (): ReactElement => {
  // This is necessary to prevent creating a new workspace on every render
  const [showDialog, setShowDialog] = useState(false)
  const [search] = useSearchParams()

  const initializedRef = useRef(false)
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

  const setUi = useUiStateStore((state) => state.setUi)

  const { showErrorDialog } = useUiStateStore((state) => state.ui)
  const setShowErrorDialog = useUiStateStore(
    (state) => state.setShowErrorDialog,
  )

  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const deleteNetworkModifiedStatus = useWorkspaceStore(
    (state) => state.deleteNetworkModifiedStatus,
  )
  const client = useCredentialStore((state) => state.client)

  const authenticated = client?.authenticated ?? false
  const { id, currentNetworkId, networkIds, networkModified } = workspace

  const parsed = parsePathName(location.pathname)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

  const setActiveTableBrowserIndex = useUiStateStore(
    (state) => state.setActiveTableBrowserIndex,
  )
  /**
   * Initializing assigned workspace for this session
   */
  const setupWorkspace = (): void => {
    // Check location and curren workspace ID
    if (id === '') {
      // No workspace ID is set
      // Check if the URL has workspace ID

      let targetWorkspaceId: string = parsed.workspaceId

      // TODO: URL design should be consolidated as constants
      if (targetWorkspaceId === 'network') {
        // Special case: network import
        targetWorkspaceId = ''
      }

      void getWorkspaceFromDb(
        // parsed.workspaceId === '' ? undefined : parsed.workspaceId,
        targetWorkspaceId === '' ? undefined : targetWorkspaceId,
      ).then((workspace) => {
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
    // Use this flag to prevent creating a new workspace more than once
    if (!initializedRef.current) {
      initializedRef.current = true
      initializeDb().catch((e) => {
        throw e
      })
      setupWorkspace()
      loadUiState()
        .then(() => {
          restorePanelStates()
          restoreTableBrowserTabState()
        })
        .catch((e) => {
          throw e
        })
    }
  }, [])

  const redirect = async (): Promise<void> => {
    if (!initializedRef.current || id === '') return

    const parsed = parsePathName(location.pathname)

    const searchParams: URLSearchParams = new URLSearchParams(location.search)
    console.log('searchParams', searchParams)
    // At this point, workspace ID is always available
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      const parsedNetworkId = parsed.networkId
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
      const { networkId } = parsed
      if (networkId === '' || networkId === undefined) {
        navigate(
          `/${id}/networks/${currentNetworkId}${location.search.toString()}`,
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
          const ndexSummaries = await networkSummaryFetcher(
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
          console.log('SUMMARY error', error)
          const errorMessage: string = error.message
          setErrorMessage(
            `Failed to load the network ${networkId}: ${errorMessage}`,
          )
          setShowErrorDialog(true)
        }
      }
    }
  }

  useEffect(() => {
    // Now workspace ID is set. route to the correct page
    if (id !== '') {
      redirect()
        .then(() => {})
        .catch((e) => {
          console.log(e)
        })
    }
  }, [id])

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ToolBar />
      <Outlet />
      <UpdateNetworkDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
      />
      <WarningDialog
        open={showErrorDialog}
        handleClose={() => {
          setShowErrorDialog(false)
        }}
      />
    </Box>
  )
}

export default AppShell
