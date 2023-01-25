import { ReactElement, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Workspace } from '../models/WorkspaceModel'
import { useWorkspaceStore } from '../store/WorkspaceStore'

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
  const initWorkspace = useWorkspaceStore((state) => state.init)
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const { id } = workspace

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      // TODO: Is this the best way to check the initial state?
      if (id === '') {
        initWorkspace()
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
    <>
      <ToolBar />
      <Outlet />
    </>
  )
}

export default AppShell
