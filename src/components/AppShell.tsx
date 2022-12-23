import React, { ReactElement, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

const ToolBar = React.lazy(() => import('./ToolBar'))

const AppShell = (): ReactElement => {
  const isWorkspace = true
  const navigate = useNavigate()

  useEffect(() => {
    if (isWorkspace) {
      const wsUuid: string = uuidv4()

      navigate(`/${wsUuid}`)
    }
  }, [isWorkspace])

  return (
    <div>
      <ToolBar />
      <Outlet />
    </div>
  )
}

export default AppShell
