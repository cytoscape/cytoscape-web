import { Box } from '@mui/material'
import { ReactElement, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const setWorkspace = useWorkspaceStore((state) => state.set)
  const workspace = useWorkspaceStore((state) => state.workspace)

  const { id } = workspace

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      // TODO: Is this the best way to check the initial state?
      if (id === '') {
        void getWorkspaceFromDb().then((workspace) => {
          setWorkspace(workspace)
        })
      }
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/' && id !== '') {
      console.log('navigating to the new network', id, location)

      navigate(`/${id}/networks`)
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
