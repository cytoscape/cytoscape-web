import './index.css'

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
import {
  INITIAL_LOADING_SCREEN_ID,
  removeLoadingScreenAfterRender,
  removeMessage,
  updateLoadingMessage,
  updateVersionText,
} from './init/loadingScreen'
import { initializeTabManager } from './init/tabManager'

// Assign CyWebApi to window for external consumers (browser extensions, LLM agents).
// Event bus and cywebapi:ready are wired in AppShell after stores hydrate from IndexedDB.
;(window as any).CyWebApi = CyWebApi

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

  // Update version text from package.json
  updateVersionText()

  // Show initial progress when React styles are loaded
  updateLoadingMessage('Loading application modules...')
  enableMapSet()
  initializeDebug()
  initializeTabManager()
  initializeGoogleAnalytics()
  const { keycloak, handleVerify, handleCancel, checkUserVerification } =
    initializeKeycloak()

  keycloak
    .init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri:
        window.location.origin + urlBaseName + 'silent-check-sso.html',
    })
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

      updateLoadingMessage('Starting application...')

      const root = ReactDOM.createRoot(rootElement)
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

      // Remove loading screen after React app is rendered
      removeLoadingScreenAfterRender()
    })
    .catch((e) => {
      // Make root element visible in case of error
      const rootEl = document.getElementById('root')
      if (rootEl) {
        rootEl.style.opacity = '1'
        rootEl.style.visibility = 'visible'
      }

      // Remove the initial loading screen
      removeMessage(INITIAL_LOADING_SCREEN_ID)

      // Failed initialization
      logStartup.error(
        `[bootstrap.tsx]:[${keycloak.init.name}]: Failed to initialize Cytoscape:`,
        e,
      )
      const errorMessage = document.createElement('h2')
      errorMessage.style.color = 'red'
      errorMessage.setAttribute('data-testid', 'init-error-message')
      errorMessage.textContent = `Failed to initialize Cytoscape: ${e.error}`
      document.body.appendChild(errorMessage)

      const errorMessageSub = document.createElement('h4')
      errorMessageSub.setAttribute('data-testid', 'init-error-message-sub')
      errorMessageSub.textContent = `Please try reloading this page. If this continues, please contact your administrator`
      document.body.appendChild(errorMessageSub)
    })
}

initializeApp()
