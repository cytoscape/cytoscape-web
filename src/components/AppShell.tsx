import React, { ReactElement, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Workspace } from '../models/WorkspaceModel'
import { useWorkspaceStore } from '../store/WorkspaceStore'

import { ToolBar } from './ToolBar'

/**
 *
 * Empty application shell only with a toolbar
 *
 */
const AppShell = (): ReactElement => {
  const navigate = useNavigate()

  const initWorkspace = useWorkspaceStore((state) => state.init)
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)

  useEffect(() => {
    const { id, currentNetworkId } = workspace
    if (id === '') {
      initWorkspace()
    } else {
      if (currentNetworkId === '') {
        navigate(`/${id}/networks`)
      }
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
