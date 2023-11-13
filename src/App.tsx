import React, { Suspense, useContext, useEffect } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import './index.css'
import { Error } from './Error'
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from 'react-router-dom'
// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import { MessagePanel } from './components/Messages'
import appConfig from './assets/config.json'
import { KeycloakContext } from '.'
import { useCredentialStore } from './store/CredentialStore'

enableMapSet()

const AppShell = React.lazy(() => import('./components/AppShell'))
const WorkspaceEditor = React.lazy(
  () => import('./components/Workspace/WorkspaceEditor'),
)

const theme = createTheme({
  palette: {
    primary: {
      main: '#337ab7',
    },
    secondary: {
      main: '#f50057',
    },
  },
})

const routerOpts: any = {}

if (appConfig.urlBaseName !== '') {
  routerOpts.basename = appConfig.urlBaseName
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={
        <Suspense
          fallback={<MessagePanel message="Preparing your workspace..." />}
        >
          <AppShell />
        </Suspense>
      }
      errorElement={<Error />}
    >
      <Route
        path=":workspaceId"
        element={
          <Suspense
            fallback={<MessagePanel message={'Initializing Workspace...'} />}
          >
            <WorkspaceEditor />
          </Suspense>
        }
      >
        <Route path="networks" element={<div />} />
        <Route path="networks/:networkId" element={<div />} />
      </Route>
    </Route>,
  ),
  routerOpts,
)

export const App = (): React.ReactElement => {
  const client = useContext(KeycloakContext)
  const setClient = useCredentialStore((state) => state.setClient)

  useEffect(() => {
    setClient(client)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
