import React, { Suspense, useContext, useEffect } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import './index.css'
import { Error } from './features/Error'
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from 'react-router-dom'
import { MessagePanel } from './features/Messages'
import appConfig from './assets/config.json'
import { KeycloakContext } from './init/keycloak'
import { useCredentialStore } from './hooks/stores/CredentialStore'
import { RedirectPanel } from './features/RedirectPanel'
import ErrorBoundary from './features/ErrorBoundary'
import { CookieConsentWidget } from './features/CookieConsent'

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
        <RouterProvider router={router} />
      </ErrorBoundary>
      <CookieConsentWidget />
    </ThemeProvider>
  )
}
