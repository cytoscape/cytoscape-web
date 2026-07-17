import './styles/index.css'

import { enableMapSet } from 'immer'
import React from 'react'
import * as ReactDOM from 'react-dom/client'

import { AppConfigContext } from './AppConfigContext'
import appConfig from './assets/config.json'
import { useCredentialStore } from './data/hooks/stores/CredentialStore'
// this allows immer to work with Map and Set
import { initializeDebug, logStartup } from './debug'
import ErrorBoundary from './features/ErrorBoundary'
import { AppBootstrap, AuthResolution } from './init/AppBootstrap'
import { initializeGoogleAnalytics } from './init/googleAnalytics'
import { initializeKeycloak, KeycloakContext } from './init/keycloak'
import { initializeTabManager } from './init/tabManager'
import { ensureTrailingSlash } from './utils/baseUrl'

// Assign CyWebApi to window for external consumers (browser extensions, LLM
// agents). Loaded asynchronously — it pulls in the store/data layer, which
// must not block the boot chunk. Consumers already have to wait for the
// cywebapi:ready event (wired in AppShell after stores hydrate) before use.
void import('./app-api/core').then(({ CyWebApi }) => {
  ;(window as any).CyWebApi = CyWebApi
})

const AUTH_INIT_TIMEOUT_MS = 4000
const LOCAL_DEV_HOSTS = new Set(['127.0.0.1', 'localhost'])

// Dev-only: `?authDelay[=ms]` holds keycloak init's resolution to simulate the
// production silent-SSO round-trip, so the boot screen handoff can be observed
// locally. Compiled away in production builds.
const DEFAULT_SIMULATED_AUTH_DELAY_MS = 1500

const getSimulatedAuthDelayMs = (): number => {
  if (!import.meta.env.DEV) return 0
  const raw = new URLSearchParams(window.location.search).get('authDelay')
  if (raw === null) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SIMULATED_AUTH_DELAY_MS
}

const UNAUTHENTICATED: AuthResolution = {
  authenticated: false,
  isEmailUnverified: false,
  userName: '',
  userEmail: '',
}

const initializeApp = () => {
  const { urlBaseName } = appConfig
  const rootElement: HTMLElement | null = document.getElementById('root')
  if (rootElement == null) {
    logStartup.error(
      `[bootstrap.tsx]:[${initializeApp.name}]: Failed to initialize Cytoscape:`,
      'Root element not found',
    )
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)

  enableMapSet()
  initializeDebug()
  initializeTabManager()
  initializeGoogleAnalytics()
  const { keycloak, handleVerify, handleCancel, checkUserVerification } =
    initializeKeycloak()
  const isLocalDevHost = LOCAL_DEV_HOSTS.has(window.location.hostname)

  // Optimistic render: the app renders immediately while the SSO check runs
  // in the background. Credentialed requests (CredentialStore.getToken) are
  // held until completeAuthInitialization so a logged-in user's startup
  // fetches can't go out anonymously. Every terminal path below (success,
  // failure, timeout) must complete initialization and resolve the promise.
  const { beginAuthInitialization, completeAuthInitialization } =
    useCredentialStore.getState()
  beginAuthInitialization()

  let resolveAuth!: (resolution: AuthResolution) => void
  const authResolution = new Promise<AuthResolution>((resolve) => {
    resolveAuth = resolve
  })

  const keycloakInitTimeout = isLocalDevHost
    ? undefined
    : window.setTimeout(() => {
        logStartup.warn(
          `[bootstrap.tsx]:[${keycloak.init.name}]: Authentication initialization timed out, continuing without SSO`,
        )

        completeAuthInitialization()
        resolveAuth(UNAUTHENTICATED)
      }, AUTH_INIT_TIMEOUT_MS)

  const keycloakInitOptions = isLocalDevHost
    ? {
        checkLoginIframe: false,
      }
    : {
        onLoad: 'check-sso' as const,
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin +
          ensureTrailingSlash(urlBaseName) +
          'silent-check-sso.html',
      }

  keycloak
    .init(keycloakInitOptions)
    .then(async (authenticated) => {
      const simulatedAuthDelayMs = getSimulatedAuthDelayMs()
      if (simulatedAuthDelayMs > 0) {
        logStartup.info(
          `[bootstrap.tsx]:[${initializeApp.name}]: Simulating ${simulatedAuthDelayMs}ms auth delay (authDelay URL parameter)`,
        )
        await new Promise((resolve) =>
          window.setTimeout(resolve, simulatedAuthDelayMs),
        )
      }

      if (keycloakInitTimeout !== undefined) {
        window.clearTimeout(keycloakInitTimeout)
      }

      // Release token waiters as soon as the SSO check settles — the email
      // verification lookup below needs the network and must not gate them.
      completeAuthInitialization()

      let isEmailUnverified = false
      let userName = ''
      let userEmail = ''

      if (authenticated) {
        const verificationStatus = await checkUserVerification()
        isEmailUnverified = !verificationStatus.isVerified
        userName = verificationStatus.userName ?? ''
        userEmail = verificationStatus.userEmail ?? ''
      }

      resolveAuth({ authenticated, isEmailUnverified, userName, userEmail })
    })
    .catch((e) => {
      if (keycloakInitTimeout !== undefined) {
        window.clearTimeout(keycloakInitTimeout)
      }

      logStartup.warn(
        `[bootstrap.tsx]:[${keycloak.init.name}]: Authentication initialization failed, continuing without SSO`,
        e,
      )

      completeAuthInitialization()
      resolveAuth(UNAUTHENTICATED)
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
}

initializeApp()
