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
import {
  currentDbScope,
  EMBED_ROUTE_SEGMENT,
  MANUAL_ROUTE_SEGMENT,
} from './data/db/dbScope'
import { useCredentialStore } from './data/hooks/stores/CredentialStore'
import { CookieConsentWidget } from './features/CookieConsent'
import { Error } from './features/Error'
import ErrorBoundary from './features/ErrorBoundary'
import { OnboardingHost } from './features/Onboarding'
import { EmbedErrorElement } from './features/Embed/EmbedErrorElement'
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
//
// A manual tab (/manual/*) or an embed (/embed/*) never mounts AppShell, so it
// skips both downloads.
const scope = currentDbScope()
const isEmbed = scope === 'embed'
const mountsAppShell = scope === 'app'
const loadAppShell = () => import('./features/AppShell')
const loadWorkspaceEditor = () => import('./features/Workspace/WorkspaceEditor')
const appShellPromise = mountsAppShell ? loadAppShell() : undefined
const workspaceEditorPromise = mountsAppShell
  ? loadWorkspaceEditor()
  : undefined

// React.lazy only subscribes to these when its boundary first renders. A chunk
// that fails to load before then would surface as an unhandledrejection —
// noise in error reporting — even though the boundary still re-throws it
// properly afterwards. These no-op handlers silence the global event only.
appShellPromise?.catch(() => undefined)
workspaceEditorPromise?.catch(() => undefined)

const AppShell = React.lazy(() => appShellPromise ?? loadAppShell())
const WorkspaceEditor = React.lazy(
  () => workspaceEditorPromise ?? loadWorkspaceEditor(),
)
// Not prefetched: most sessions never open the manual (#840).
const ManualApp = React.lazy(() => import('./features/Manual/ManualApp'))
const EmbedRoute = React.lazy(() => import('./features/Embed/EmbedRoute'))

const routerOpts: any = {}

if (appConfig.urlBaseName !== '') {
  routerOpts.basename = appConfig.urlBaseName
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/*
      A sibling of "/", not a child: the manual must not mount AppShell, whose
      boot loads the workspace. A static segment outranks ":workspaceId", so
      /manual never reaches the workspace route.
    */}
      <Route
        path={`/${MANUAL_ROUTE_SEGMENT}/*`}
        element={
          <Suspense fallback={null}>
            <ManualApp />
          </Suspense>
        }
        errorElement={<Error />}
      />
      {/*
      A sibling of "/" for the same reason as the manual: the embed shows one
      network read-only in a third-party iframe and never mounts AppShell. Its
      own error element keeps errors in the frame, not on /error.
    */}
      <Route
        path={`/${EMBED_ROUTE_SEGMENT}/:networkId?`}
        element={
          <Suspense fallback={<BootShell region="content" />}>
            <EmbedRoute />
          </Suspense>
        }
        errorElement={<EmbedErrorElement />}
      />
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
      </Route>
      {/*
      A sibling of "/" for the same reason as the manual (#886): under "/" it
      mounted AppShell, so an error from /manual ran the workspace boot against
      the manual's database, and that boot navigated away from the error page.
    */}
      <Route path="/error" element={<Error />} />
    </>,
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
        {/* The embed has no tour and, with analytics off, nothing to consent
            to; both would pop up inside the host page's frame. */}
        {!isEmbed && (
          <ErrorBoundary fallback={null}>
            <OnboardingHost />
          </ErrorBoundary>
        )}
      </ErrorBoundary>
      {!isEmbed && <CookieConsentWidget />}
    </CssVarsProvider>
  )
}
