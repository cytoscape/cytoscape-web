import * as ReactDOM from 'react-dom/client'
import './index.css'
import './split-pane.css'
import './data-grid.css'
import appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'
import { EmailVerificationModal } from './components/EmailVerification'
import ReactGA from 'react-ga4'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React, { createContext } from 'react'
import Keycloak from 'keycloak-js'
import ErrorBoundary from './ErrorBoundary'
enableMapSet()

console.log('-----------BS start')

export const KeycloakContext = createContext<Keycloak>(new Keycloak())

const rootElement: HTMLElement | null = document.getElementById('root')
const { keycloakConfig, urlBaseName, googleAnalyticsId } = appConfig

const LOADING_MESSAGE_ID = 'loadingMessage'

const removeMessage = (id: string): void => {
  const message = document.getElementById(id)
  if (message && message.parentNode) {
    message.parentNode.removeChild(message)
  }
}

if (googleAnalyticsId !== '') {
  ReactGA.initialize(googleAnalyticsId)
}

// Display simple loading message without using React
const loadingMessage = document.createElement('h2')
// Set ID for this temp element
loadingMessage.id = LOADING_MESSAGE_ID
loadingMessage.textContent = 'Initializing Cytoscape. Please wait...'
document.body.appendChild(loadingMessage)

const keycloak = new Keycloak(keycloakConfig)

const handleVerify = async () => {
  await keycloak.loadUserProfile()
  window.location.reload()
}

const handleCancel = () => {
  keycloak.logout()
}

keycloak
  .init({
    onLoad: 'check-sso',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri:
      window.location.origin + urlBaseName + 'silent-check-sso.html',
  })
  .then(async (authenticated) => {
    let emailUnverified = true
    if (authenticated) {
      // check the whether the email is verified
      keycloak.loadUserInfo()
      if (profile.emailVerified) emailUnverified = false
    }
    // Remove the loading message
    removeMessage(LOADING_MESSAGE_ID)

    if (rootElement !== null) {
      ReactDOM.createRoot(rootElement).render(
        <AppConfigContext.Provider value={appConfig}>
          <React.StrictMode>
            <KeycloakContext.Provider value={keycloak}>
              <ErrorBoundary>
                <App />
                <EmailVerificationModal
                  open={authenticated && emailUnverified}
                  onVerify={handleVerify}
                  onCancel={handleCancel}
                />
              </ErrorBoundary>
            </KeycloakContext.Provider>
          </React.StrictMode>
        </AppConfigContext.Provider>,
      )
    } else {
      throw new Error('Cannot initialize app: Root element not found')
    }
  })
  .catch((e) => {
    // Remove the loading message
    removeMessage(LOADING_MESSAGE_ID)

    // Failed initialization
    console.warn('Failed to initialize Cytoscape:', e)
    const errorMessage = document.createElement('h2')
    errorMessage.style.color = 'red'
    errorMessage.textContent = `Failed to initialize Cytoscape: ${e.error}`
    document.body.appendChild(errorMessage)

    const errorMessageSub = document.createElement('h4')
    errorMessageSub.textContent = `Please rty reload this page. If this continues, please contact your administrator`
    document.body.appendChild(errorMessageSub)
  })
