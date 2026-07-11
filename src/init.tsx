import './styles/index.css'

import { enableMapSet } from 'immer'
import React from 'react'
import * as ReactDOM from 'react-dom/client'

import { App } from './App'
import { CyWebApi } from './app-api/core'
import { AppConfigContext } from './AppConfigContext'
import appConfig from './assets/config.json'
// this allows immer to work with Map and Set
import { initializeDebug, logStartup } from './debug'
import { EmailVerificationModal } from './features/EmailVerification'
import ErrorBoundary from './features/ErrorBoundary'
import { FeatureAvailabilityProvider } from './features/FeatureAvailability'
import { initializeGoogleAnalytics } from './init/googleAnalytics'
import { initializeKeycloak, KeycloakContext } from './init/keycloak'
import { BootScreen } from './init/BootScreen'
import { initializeTabManager } from './init/tabManager'

// Assign CyWebApi to window for external consumers (browser extensions, LLM agents).
// Event bus and cywebapi:ready are wired in AppShell after stores hydrate from IndexedDB.
;(window as any).CyWebApi = CyWebApi

const AUTH_INIT_TIMEOUT_MS = 4000
const LOCAL_DEV_HOSTS = new Set(['127.0.0.1', 'localhost'])

const initializeApp = () => {
  const { urlBaseName, debug } = appConfig
  const rootElement: HTMLElement | null = document.getElementById('root')
  if (rootElement == null) {
    logStartup.error(
      `[bootstrap.tsx]:[${initializeApp.name}]: Failed to initialize Cytoscape:`,
      'Root element not found',
    )
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)
  
  let currentLoadingMessage = 'Starting...'
  let hasRenderedApp = false

  const updateLoadingMessage = (message: string) => {
    if (!hasRenderedApp) {
      currentLoadingMessage = message
      root.render(<BootScreen loadingMessage={currentLoadingMessage} />)
    }
  }

  // Show initial progress when React styles are loaded
  updateLoadingMessage('Loading application modules...')
  enableMapSet()
  initializeDebug()
  initializeTabManager()
  initializeGoogleAnalytics()
  const { keycloak, handleVerify, handleCancel, checkUserVerification } =
    initializeKeycloak()
  const isLocalDevHost = LOCAL_DEV_HOSTS.has(window.location.hostname)

  const renderApp = ({
    authenticated,
    isEmailUnverified = false,
    userName = '',
    userEmail = '',
  }: {
    authenticated: boolean
    isEmailUnverified?: boolean
    userName?: string
    userEmail?: string
  }) => {
    updateLoadingMessage('Starting application...')

    const innerContent =
      authenticated && isEmailUnverified ? (
        <EmailVerificationModal
          userName={userName}
          userEmail={userEmail}
          onVerify={handleVerify}
          onCancel={handleCancel}
        />
      ) : (
        <FeatureAvailabilityProvider>
          <App />
        </FeatureAvailabilityProvider>
      )
    const outerContent = (
      <AppConfigContext.Provider value={appConfig}>
        <React.StrictMode>
          <KeycloakContext.Provider value={keycloak}>
            <ErrorBoundary>{innerContent}</ErrorBoundary>
          </KeycloakContext.Provider>
        </React.StrictMode>
      </AppConfigContext.Provider>
    )

    root.render(outerContent)
  }

  const renderAppOnce = (options: {
    authenticated: boolean
    isEmailUnverified?: boolean
    userName?: string
    userEmail?: string
  }) => {
    if (hasRenderedApp) {
      return
    }

    hasRenderedApp = true
    renderApp(options)
  }

  const keycloakInitTimeout = isLocalDevHost
    ? undefined
    : window.setTimeout(() => {
        logStartup.warn(
          `[bootstrap.tsx]:[${keycloak.init.name}]: Authentication initialization timed out, continuing without SSO`,
        )

        renderAppOnce({ authenticated: false })
      }, AUTH_INIT_TIMEOUT_MS)

  const keycloakInitOptions = isLocalDevHost
    ? {
        checkLoginIframe: false,
      }
    : {
        onLoad: 'check-sso' as const,
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + urlBaseName + 'silent-check-sso.html',
      }

  keycloak
    .init(keycloakInitOptions)
    .then(async (authenticated) => {
      let isEmailUnverified = true
      let userName = ''
      let userEmail = ''

      updateLoadingMessage('Loading configuration...')

      updateLoadingMessage('Initializing authentication...')

      if (authenticated) {
        updateLoadingMessage('Verifying user credentials...')
        const verificationStatus = await checkUserVerification()
        isEmailUnverified = !verificationStatus.isVerified
        userName = verificationStatus.userName ?? ''
        userEmail = verificationStatus.userEmail ?? ''
      }

      if (keycloakInitTimeout !== undefined) {
        window.clearTimeout(keycloakInitTimeout)
      }

      renderAppOnce({
        authenticated,
        isEmailUnverified,
        userName,
        userEmail,
      })
    })
    .catch((e) => {
      if (keycloakInitTimeout !== undefined) {
        window.clearTimeout(keycloakInitTimeout)
      }

      logStartup.warn(
        `[bootstrap.tsx]:[${keycloak.init.name}]: Authentication initialization failed, continuing without SSO`,
        e,
      )

      renderAppOnce({ authenticated: false })
    })
}

initializeApp()
