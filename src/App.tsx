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
import { OnboardingHost } from './features/Onboarding'
import { RedirectPanel } from './features/RedirectPanel'
import { BootShell } from './boot/shell/BootShell'
import { KeycloakContext } from '@/boot/keycloak'
import { theme } from './theme'

// Started at module load rather than on first render, mirroring AppBootstrap's
// prefetch of the App chunk. React.lazy alone requests a chunk only when its
// boundary first renders.
//
// The WorkspaceEditor prefetch is the one that pays: its boundary does not
// render until AppShell's boot navigates to /:workspaceId, so without this its
// download does not even begin until the workspace is already hydrated.
// Measured on a production build at 4 Mbps/100ms (median of 5 cold loads),
// workspace-editor-mounted goes 4359ms -> 4148ms. AppShell's own prefetch is
// close to free (3206ms -> 3194ms) because its boundary renders immediately;
// it is kept for symmetry and for slower links.
const appShellPromise = import('./features/AppShell')
const workspaceEditorPromise = import('./features/Workspace/WorkspaceEditor')

// React.lazy only subscribes to these when its boundary first renders. A chunk
// that fails to load before then would surface as an unhandledrejection —
// noise in error reporting — even though the boundary still re-throws it
// properly afterwards. These no-op handlers silence the global event only.
appShellPromise.catch(() => undefined)
workspaceEditorPromise.catch(() => undefined)

const AppShell = React.lazy(() => appShellPromise)
const WorkspaceEditor = React.lazy(() => workspaceEditorPromise)

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
        {/*
          Full height so percentage-height children resolve against the
          viewport. Without it this wrapper collapses to content height, and a
          route element sized with height:100% — the boot shell — shrank from
          900px to 495px the moment React took over from the pre-React shell.
          AppShell never surfaced this because it uses 100vh.
        */}
        <div data-testid="app-router" style={{ height: '100%' }}>
          <RouterProvider router={router} />
        </div>
        {/*
          Its own boundary, with a null fallback. A crash in the tour runner
          (react-joyride walking a DOM that moved under it) must be caught, but
          the outer boundary would swap the whole app — router included — for
          the error page. The tour is an overlay: dropping just the overlay
          leaves the user where they were.
        */}
        <ErrorBoundary fallback={null}>
          <OnboardingHost />
        </ErrorBoundary>
      </ErrorBoundary>
      <CookieConsentWidget />
    </CssVarsProvider>
  )
}
