import './styles/index.css'

import { Box } from '@mui/material'
import CssBaseline from '@mui/material/CssBaseline'
import {
  Experimental_CssVarsProvider as CssVarsProvider,
  experimental_extendTheme as extendTheme,
} from '@mui/material/styles'
import type {} from '@mui/material/themeCssVarsAugmentation'
import React, { Suspense, useContext, useEffect } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom'

import appConfig from './assets/config.json'
import { useCredentialStore } from './data/hooks/stores/CredentialStore'
import { CookieConsentWidget } from './features/CookieConsent'
import { Error } from './features/Error'
import ErrorBoundary from './features/ErrorBoundary'
import { MessagePanel } from './features/Messages'
import { RedirectPanel } from './features/RedirectPanel'
import { BootScreen } from './init/BootScreen'
import { KeycloakContext } from './init/keycloak'
import { theme } from './theme'


const AppShell = React.lazy(() => import('./features/AppShell'))
const WorkspaceEditor = React.lazy(() => import('./features/Workspace/WorkspaceEditor'))

const routerOpts: any = {}

if (appConfig.urlBaseName !== '') {
  routerOpts.basename = appConfig.urlBaseName
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={
        // BootScreen (not a bare message panel) so the boot visual persists
        // as one continuous screen until the app shell can render — avoids a
        // jarring full-screen context switch mid-boot.
        <Suspense
          fallback={<BootScreen loadingMessage="Preparing your workspace..." />}
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
  const exTheme = extendTheme(theme)
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
    <CssVarsProvider theme={exTheme} defaultMode="system">
      <CssBaseline />
      <ErrorBoundary>
        <div data-testid="app-router">
          <RouterProvider router={router} />
        </div>
      </ErrorBoundary>
      <CookieConsentWidget />
    </CssVarsProvider>
  )
}
