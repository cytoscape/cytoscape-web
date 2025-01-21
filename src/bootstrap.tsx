import * as ReactDOM from 'react-dom/client'
import './index.css'
import './split-pane.css'
import './data-grid.css'
import appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { FeatureAvailabilityProvider } from './components/FeatureAvailability'
import { App } from './App'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { EmailVerificationModal } from './components/EmailVerification'
import ReactGA from 'react-ga4'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React, { createContext } from 'react'
import Keycloak from 'keycloak-js'
import ErrorBoundary from './ErrorBoundary'
enableMapSet()

interface UserInfo {
  preferred_username: string
  email: string
}

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
  window.location.reload()
}

const handleCancel = () => {
  keycloak.logout({ redirectUri: window.location.origin + urlBaseName })
}

// Function to parse the error message to get the user information
const parseMessage = (
  message: string,
): { userName: string; userEmail: string } | null => {
  const pattern = /NDEx user account ([\w.]+) <([\w.]+@[\w.]+)>/
  const match = message.match(pattern)

  if (match) {
    const userName = match[1]
    const userEmail = match[2]
    return { userName, userEmail }
  }
  return null
}

// Function to check if the user's email is verified
const checkUserVerification = async () => {
  try {
    const ndexClient = new NDEx(appConfig.ndexBaseUrl)
    const userObj = await ndexClient.signInFromIdToken(keycloak.token)
    return {
      isVerified: true,
    }
  } catch (e) {
    // If response contains the verification error, trigger verification modal
    if (
      e.status === 401 &&
      e.response?.data?.errorCode === 'NDEx_User_Account_Not_Verified'
    ) {
      const userInfo = parseMessage(e.response?.data?.message)
      return {
        isVerified: false,
        userName: userInfo?.userName,
        userEmail: userInfo?.userEmail,
      }
    }
    return {
      isVerified: true,
    }
  }
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
    let userName = ''
    let userEmail = ''
    if (authenticated) {
      const verificationStatus = await checkUserVerification()
      emailUnverified = !verificationStatus.isVerified
      userName = verificationStatus.userName ?? ''
      userEmail = verificationStatus.userEmail ?? ''
    }

    // Remove the loading message
    removeMessage(LOADING_MESSAGE_ID)

    if (rootElement !== null) {
      if (authenticated && emailUnverified) {
        ReactDOM.createRoot(rootElement).render(
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
      } else {
        ReactDOM.createRoot(rootElement).render(
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
      }
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
