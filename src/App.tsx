import './styles/index.css'

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
import { RedirectPanel } from './features/RedirectPanel'
import { BootShell } from './boot/shell/BootShell'
import { KeycloakContext } from '@/boot/keycloak'
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
        // The same boot shell that painted before React: the real shell
        // replaces it region by region, so the boot sequence reads as the app
        // assembling rather than a series of unrelated loading screens. The
        // status line comes from the live boot phase, not from this boundary.
        <Suspense fallback={<BootShell />}>
          <AppShell />
        </Suspense>
      }
      errorElement={<Error />}
    >
      <Route
        path=":workspaceId"
        element={
          // Content region only — the real toolbar is already rendered by
          // AppShell above, so only the region below it is still resolving.
          <Suspense fallback={<BootShell region="content" />}>
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
