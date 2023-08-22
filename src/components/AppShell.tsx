import { Box } from '@mui/material'
import { ReactElement, useEffect, useRef } from 'react'
import { Location, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { getWorkspaceFromDb } from '../store/persist/db'

import { ToolBar } from './ToolBar'
import { parsePathName } from '../utils/paths-util'
import { WarningDialog } from './ExternalLoading/WarningDialog'
import { useUiStateStore } from '../store/UiStateStore'

/**
 *
 * Empty application shell only with a toolbar
 *
 *  - Actual contents will be rendered by the router
 *
 */
const AppShell = (): ReactElement => {
  // This is necessary to prevent creating a new workspace on every render
  const initializedRef = useRef(false)
  const navigate = useNavigate()
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const workspace = useWorkspaceStore((state) => state.workspace)
  const location: Location = useLocation()

  const addNetworkIds = useWorkspaceStore((state) => state.addNetworkIds)
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const { showErrorDialog } = useUiStateStore((state) => state.ui)
  // const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)
  const setShowErrorDialog = useUiStateStore(
    (state) => state.setShowErrorDialog,
  )

  const { id, currentNetworkId, networkIds } = workspace

  /**
   * Initializing assigned workspace for this session
   */
  const setupWorkspace = (): void => {
    // Check location and curren workspace ID
    const { pathname } = location
    if (id === '') {
      // No workspace ID is set
      // Check if the URL has workspace ID
      const parsed = parsePathName(pathname)

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
  /**
   * Once this component is initialized, check the workspace ID
   */
  useEffect(() => {
    // Use this flag to prevent creating a new workspace more than once
    if (!initializedRef.current) {
      initializedRef.current = true
      setupWorkspace()
    }
  }, [])

  const redirect = (): void => {
    if (!initializedRef.current || id === '') return

    const parsed = parsePathName(location.pathname)

    // At this point, workspace ID is always available
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      const parsedNetworkId = parsed.networkId
      if (parsedNetworkId !== '' && parsedNetworkId !== undefined) {
        addNetworkIds(parsedNetworkId)
        setCurrentNetworkId(parsedNetworkId)
        navigate(`/${id}/networks/${parsedNetworkId}`)
      } else if (networkIds.length > 0) {
        // Case 1: Current network is not available
        // Pick the first one if network is in the workspace
        navigate(`/${id}/networks/${networkIds[0]}`)
      } else {
        // Otherwise, display empty page
        navigate(`/${id}/networks`)
      }
    } else {
      // This is the network ID in the URL, not yet set as the current network ID
      // No network ID in the URL --> redirect to the current network
      const { networkId } = parsed
      if (networkId === '' || networkId === undefined) {
        navigate(`/${id}/networks/${currentNetworkId}`)
      } else if (networkId === currentNetworkId) {
        navigate(`/${id}/networks/${currentNetworkId}`)
      } else {
        // URL has different network ID
        const idSet = new Set(networkIds)
        if (idSet.has(networkId)) {
          // the ID in the URL is in the workspace
          navigate(`/${id}/networks/${networkId}`)
        } else {
          // Add to the workspace
          addNetworkIds(networkId)
          setCurrentNetworkId(networkId)
          navigate(`/${id}/networks/${networkId}`)
        }
      }
    }
  }

  useEffect(() => {
    // Now workspace ID is set. route to the correct page
    if (id !== '') {
      redirect()
    }
  }, [id])

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ToolBar />
      <Outlet />
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
