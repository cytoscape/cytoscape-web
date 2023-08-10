import { Box } from '@mui/material'
import { ReactElement, useEffect, useRef } from 'react'
import { Location, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { getWorkspaceFromDb } from '../store/persist/db'

import { ToolBar } from './ToolBar'

/**
 *
 * Empty application shell only with a toolbar
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

  const { id } = workspace

  const extractNetworkId = (location: Location): string => {
    const path = location.pathname
    const parts = path.split('/')
    if (parts.length > 3) {
      return parts[3]
    }
    return ''
  }

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      // TODO: Is this the best way to check the initial state?
      if (id === '') {
        void getWorkspaceFromDb().then((workspace) => {
          // This sets current network ID, too
          setWorkspace(workspace)
        })
      }
    }
  }, [])

  useEffect(() => {
    if (id !== '') {
      console.log('!workspace', workspace, location)
      const { currentNetworkId, networkIds } = workspace

      if (currentNetworkId === '' || currentNetworkId === undefined) {
        if (networkIds.length > 0) {
          navigate(`/${id}/networks/${networkIds[0]}`)
        } else {
          navigate(`/${id}/networks`)
        }
      } else {
        const networkId = extractNetworkId(location)
        if (networkId === currentNetworkId) {
          navigate(`/${id}/networks/${currentNetworkId}`)
        } else {
          // Change the current network ID
          const { networkIds } = workspace
          const idSet = new Set(networkIds)
          if (idSet.has(networkId)) {
            // the ID in the URL is in the workspace
            navigate(`/${id}/networks/${networkId}`)
          } else {
            // NOT Found
            // Add to the workspace
            addNetworkIds(networkId)
            setCurrentNetworkId(networkId)
            navigate(`/${id}/networks/${networkId}`)
          }
        }
      }
    }
  }, [workspace])

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ToolBar />
      <Outlet />
    </Box>
  )
}

export default AppShell
