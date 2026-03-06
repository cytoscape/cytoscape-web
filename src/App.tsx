import './index.css'

import CssBaseline from '@mui/material/CssBaseline'
import { Box } from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React, { Suspense, useContext, useEffect } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom'

import appConfig from './assets/config.json'
import { CookieConsentWidget } from './features/CookieConsent'
import { Error } from './features/Error'
import ErrorBoundary from './features/ErrorBoundary'
import { MessagePanel } from './features/Messages'
import { RedirectPanel } from './features/RedirectPanel'
import { useCredentialStore } from './data/hooks/stores/CredentialStore'
import { KeycloakContext } from './init/keycloak'

const AppShell = React.lazy(() => import('./features/AppShell'))
const WorkspaceEditor = React.lazy(
  () => import('./features/Workspace/WorkspaceEditor'),
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

const routerOpts: { basename?: string } = {}

if (appConfig.urlBaseName !== '') {
  routerOpts.basename = appConfig.urlBaseName
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={
        <Suspense
          fallback={
            <Box sx={{ width: '100%', height: '100vh' }}>
              <MessagePanel
                message="Preparing your workspace..."
                data-testid="app-shell-loading"
              />
            </Box>
          }
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
            fallback={
              <Box sx={{ width: '100%', height: '100vh' }}>
                <MessagePanel
                  message={'Initializing Workspace...'}
                  data-testid="workspace-editor-loading"
                />
              </Box>
            }
          >
            <WorkspaceEditor />
          </Suspense>
        }
        errorElement={<Error />}
      >
        <Route path="networks" element={<div />} errorElement={<Error />} />
        <Route
          path="networks/:networkId"
          element={<div />}
          errorElement={<Error />}
        />
        <Route path="*" element={<RedirectPanel />} />
      </Route>

      <Route path="/error" element={<Error />} />
    </Route>,
  ),
  routerOpts,
)

export const App = (): React.ReactElement => {
  const client = useContext(KeycloakContext)
  const setClient = useCredentialStore((state) => state.setClient)

  useEffect(() => {
    setClient(client)
  }, [client, setClient])

  // Initialize history clearing on app startup
  useEffect(() => {
    // Temporarily disable history clearing to preserve URLs on reload
    // initHistoryClearing()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <div data-testid="app-router">
          <RouterProvider router={router} />
        </div>
      </ErrorBoundary>
      <CookieConsentWidget />
    </ThemeProvider>
  )
}
