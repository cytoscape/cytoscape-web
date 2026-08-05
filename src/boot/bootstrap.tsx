import '../styles/index.css'

import { enableMapSet } from 'immer'
import React from 'react'
import * as ReactDOM from 'react-dom/client'

import { AppConfigContext } from '../AppConfigContext'
import { publishHostDescriptor } from '../app-api/federation/hostDescriptor'
import appConfig from '../assets/config.json'
import { initializeDebug, logStartup } from '../debug'
import ErrorBoundary from '../features/ErrorBoundary'
import { AppBootstrap } from './AppBootstrap'
import { BootPhase } from './bootPhases'
import { getBootState } from './bootState'
import { initializeGoogleAnalytics } from './googleAnalytics'
import { initializeKeycloak, KeycloakContext } from './keycloak'
import { markBoot } from './metrics/bootMarks'
import { openDatabasePhase } from './openDatabasePhase'
import { isBootAborted, runPhase } from './runBoot'
import { repaintBootShell } from './shell/showBootShell'
import { startAuthentication } from './startAuthentication'
import { initializeTabManager } from './tabManager'
import { runOnIdle } from '../utils/idlePrefetch'

// Boot entry point. Deliberately thin: it wires phases together and renders.
// The phases themselves live in their own modules, and runPhase gives each one
// timing and error handling — see boot_docs/boot.md for the full sequence.

// Publish the host descriptor a federated app's Module Federation runtime reads
// to find this host's remoteEntry.js. Assigned SYNCHRONOUSLY at boot-chunk
// evaluation: a remote's beforeInit hook is synchronous and must never lose a
// race with this. Deliberately NOT part of window.CyWebApi below — that object
// arrives from an async import() and its consumers are gated behind
// cywebapi:ready, which is far too late and the wrong shape for a sync hook.
publishHostDescriptor(window, import.meta.env.BASE_URL, window.location.href)

// Assign CyWebApi to window for external consumers (browser extensions, LLM
// agents). Loaded asynchronously — it pulls in the store/data layer, which
// must not block the boot chunk. Consumers already have to wait for the
// cywebapi:ready event (fired in AppShell after stores hydrate) before use.
void import('../app-api/core').then(({ CyWebApi }) => {
  ;(window as any).CyWebApi = CyWebApi
})

const initializeApp = async (): Promise<void> => {
  markBoot('init-exec')

  const rootElement: HTMLElement | null = document.getElementById('root')
  if (rootElement === null) {
    // Nothing to render into and nowhere to show an error — index.html is
    // broken. Throwing is the only signal available.
    logStartup.error('[boot]: #root not found; cannot start Cytoscape Web')
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)

  await runPhase(BootPhase.RUNTIME, () => {
    enableMapSet() // lets immer work with Map and Set
    initializeDebug()

    // Independently guarded rather than inlined above: it touches an API a
    // hardened browsing context can refuse — window.name — and it is not a
    // prerequisite for the app, so being blocked must not abort the phase.
    try {
      initializeTabManager()
    } catch (cause) {
      logStartup.warn('[boot]: tab identity unavailable', cause)
    }
  })

  const { keycloak, handleVerify, handleCancel, checkUserVerification } =
    initializeKeycloak()

  // Started before the database gate on purpose: the silent-SSO check is
  // network-bound while the database open is disk-bound, so the two overlap.
  // Not awaited — the app renders optimistically over the SSO check.
  // CredentialStore's auth gate — not ordering — is what keeps a logged-in
  // user's startup fetches from going out anonymously. The check runs in a
  // hidden iframe and never navigates the top-level page, so if the database
  // gate below aborts the boot, an in-flight check is harmless under the
  // error shell.
  const authResolution = startAuthentication({
    keycloak,
    checkUserVerification,
    urlBaseName: appConfig.urlBaseName,
  })

  // The gate. A dead database is the one failure the app cannot render over —
  // AppShell's first act is to read the workspace from it — so on failure the
  // boot shell (already painted, no React required) switches to error mode and
  // we stop here rather than mounting the app over it.
  await runPhase(BootPhase.DATABASE, openDatabasePhase)
  if (isBootAborted()) {
    repaintBootShell({ error: getBootState().error })
    return
  }

  root.render(
    <AppConfigContext.Provider value={appConfig}>
      <React.StrictMode>
        <KeycloakContext.Provider value={keycloak}>
          <ErrorBoundary>
            <AppBootstrap
              authResolution={authResolution}
              onVerify={handleVerify}
              onCancel={handleCancel}
            />
          </ErrorBoundary>
        </KeycloakContext.Provider>
      </React.StrictMode>
    </AppConfigContext.Provider>,
  )

  markBoot('react-render')

  // Analytics is pure overhead for startup: deferred to idle time so the gtag
  // script never competes with the boot-critical chunks or the SSO iframe for
  // the connection. Guarded because analytics storage can be refused by a
  // hardened browsing context, and that must not take anything down with it.
  runOnIdle(() => {
    try {
      initializeGoogleAnalytics()
    } catch (cause) {
      logStartup.warn('[boot]: analytics initialization failed', cause)
    }
  })
}

void initializeApp()
