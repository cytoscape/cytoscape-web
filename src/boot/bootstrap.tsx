import '../styles/index.css'

import { enableMapSet } from 'immer'
import React from 'react'
import * as ReactDOM from 'react-dom/client'

import { AppConfigContext } from '../AppConfigContext'
import appConfig from '../assets/config.json'
import { initializeDebug, logStartup } from '../debug'
import ErrorBoundary from '../features/ErrorBoundary'
import { AppBootstrap } from './AppBootstrap'
import { BootPhase } from './bootPhases'
import { initializeGoogleAnalytics } from './googleAnalytics'
import { initializeKeycloak, KeycloakContext } from './keycloak'
import { markBoot } from './metrics/bootMarks'
import { runPhase } from './runBoot'
import { startAuthentication } from './startAuthentication'
import { initializeTabManager } from './tabManager'

// Boot entry point. Deliberately thin: it wires phases together and renders.
// The phases themselves live in their own modules, and runPhase gives each one
// timing and error handling — see boot_docs/boot.md for the full sequence.

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
    initializeTabManager()
    initializeGoogleAnalytics()
  })

  const { keycloak, handleVerify, handleCancel, checkUserVerification } =
    initializeKeycloak()

  // Started, not awaited: the app renders optimistically over the SSO check.
  // CredentialStore's auth gate — not ordering — is what keeps a logged-in
  // user's startup fetches from going out anonymously.
  const authResolution = startAuthentication({
    keycloak,
    checkUserVerification,
    urlBaseName: appConfig.urlBaseName,
  })

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
}

void initializeApp()
