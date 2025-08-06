import * as ReactDOM from 'react-dom/client'
import { enableMapSet } from 'immer'
import React from 'react'

import './index.css'

import appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

import { EmailVerificationModal } from './components/EmailVerification'
import { FeatureAvailabilityProvider } from './components/FeatureAvailability'
import ErrorBoundary from './components/ErrorBoundary'

// this allows immer to work with Map and Set
import { initializeDebug, logStartup } from './debug'
import {
  INITIAL_LOADING_SCREEN_ID,
  removeLoadingScreenAfterRender,
  updateLoadingMessage,
  updateVersionText,
  removeMessage,
} from './init/loading-screen'
import { initializeGoogleAnalytics } from './init/google-analytics'
import { initializeKeycloak, KeycloakContext } from './init/keycloak'
import { initializeTabManager } from './init/tab-manager'

const initializeApp = () => {
  const { urlBaseName } = appConfig
  const rootElement: HTMLElement | null = document.getElementById('root')
  if (rootElement === null) {
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
      let emailUnverified = true
      let userName = ''
      let userEmail = ''

      updateLoadingMessage('Loading configuration...')

      // Small delay to show progress step
      await new Promise((resolve) => setTimeout(resolve, 200))

      updateLoadingMessage('Initializing authentication...')

      if (authenticated) {
        updateLoadingMessage('Verifying user credentials...')
        const verificationStatus = await checkUserVerification()
        emailUnverified = !verificationStatus.isVerified
        userName = verificationStatus.userName ?? ''
        userEmail = verificationStatus.userEmail ?? ''
      }

      updateLoadingMessage('Starting application...')

      if (rootElement !== null) {
        if (authenticated && emailUnverified) {
          const root = ReactDOM.createRoot(rootElement)
          root.render(
            <AppConfigContext.Provider value={appConfig}>
              <React.StrictMode>
                <KeycloakContext.Provider value={keycloak}>
                  <ErrorBoundary>
                    <EmailVerificationModal
                      userName={userName}
                      userEmail={userEmail}
                      onVerify={handleVerify}
                      onCancel={handleCancel}
                    />
                  </ErrorBoundary>
                </KeycloakContext.Provider>
              </React.StrictMode>
            </AppConfigContext.Provider>,
          )

          // Remove loading screen after React app is rendered
          removeLoadingScreenAfterRender()
        } else {
          const root = ReactDOM.createRoot(rootElement)
          root.render(
            <AppConfigContext.Provider value={appConfig}>
              <React.StrictMode>
                <KeycloakContext.Provider value={keycloak}>
                  <FeatureAvailabilityProvider>
                    <ErrorBoundary>
                      <App />
                    </ErrorBoundary>
                  </FeatureAvailabilityProvider>
                </KeycloakContext.Provider>
              </React.StrictMode>
            </AppConfigContext.Provider>,
          )

          // Remove loading screen after React app is rendered
          removeLoadingScreenAfterRender()
        }
      } else {
        logStartup.error(
          `[bootstrap.tsx]:[${keycloak.init.name}]: Failed to initialize Cytoscape:`,
          'Root element not found',
        )
        throw new Error('Root element not found')
      }
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
      errorMessage.textContent = `Failed to initialize Cytoscape: ${e.error}`
      document.body.appendChild(errorMessage)

      const errorMessageSub = document.createElement('h4')
      errorMessageSub.textContent = `Please try reloading this page. If this continues, please contact your administrator`
      document.body.appendChild(errorMessageSub)
    })
}

initializeApp()
