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
import { initTabManager } from './tab-manager'
enableMapSet()

// Window name of this instance based on the current time
window.name = initTabManager()
console.log(
  'Cytoscape window name initialized. ',
  'Use this as the target when you open this tab again.',
  window.name,
)

export const KeycloakContext = createContext<Keycloak>(new Keycloak())

const rootElement: HTMLElement | null = document.getElementById('root')
const { keycloakConfig, urlBaseName, googleAnalyticsId } = appConfig

const INITIAL_LOADING_SCREEN_ID = 'initial-loading-screen'

const removeMessage = (id: string): void => {
  const element = document.getElementById(id)
  if (element && element.parentNode) {
    // Immediate removal without fade animation for faster response
    element.parentNode.removeChild(element)
  }
}

// Function to remove loading screen after React app is fully rendered
const removeLoadingScreenAfterRender = (): void => {
  // Use multiple animation frames to ensure all rendering is complete
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Check if React app has actually rendered content
      const rootEl = document.getElementById('root')
      if (rootEl && rootEl.children.length > 0) {
        const loadingScreen = document.getElementById(INITIAL_LOADING_SCREEN_ID)
        if (loadingScreen) {
          // First, make the app content visible and ready
          rootEl.style.opacity = '1'
          rootEl.style.visibility = 'visible'

          // Then wait for the app content to be displayed before starting the fade
          setTimeout(() => {
            // Set up the fade out with precise timing and visibility control
            loadingScreen.style.opacity = '0'
            loadingScreen.style.visibility = 'hidden'
            loadingScreen.style.transition =
              'opacity 0.08s ease-out, visibility 0.08s ease-out'

            // Remove the loading screen element after fade completes
            setTimeout(() => {
              if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen)
              }
            }, 80)
          }, 60) // Slightly longer delay to ensure app is fully visible
        }
      } else {
        // If React hasn't rendered yet, try again very quickly
        setTimeout(() => removeLoadingScreenAfterRender(), 10)
      }
    })
  })
}

const updateLoadingMessage = (message: string): void => {
  const loadingScreen = document.getElementById(INITIAL_LOADING_SCREEN_ID)
  if (loadingScreen) {
    const messageElement = loadingScreen.querySelector('.loading-message')

    if (messageElement) {
      messageElement.textContent = message
    }
  }
}

// Constants injected by webpack DefinePlugin
declare const REACT_APP_VERSION: string
declare const REACT_APP_BUILD_TIME: string

const updateVersionText = (): void => {
  const versionElement = document.getElementById('version-text')
  const buildTimeElement = document.getElementById('build-time-text')

  if (versionElement) {
    const version =
      typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'
    versionElement.textContent = `Version ${version}`
  }

  if (buildTimeElement) {
    const buildTime =
      typeof REACT_APP_BUILD_TIME !== 'undefined'
        ? REACT_APP_BUILD_TIME
        : 'Unknown'
    // Format the build time to be more readable
    let formattedBuildTime = buildTime
    if (buildTime !== 'Unknown') {
      try {
        const date = new Date(buildTime)
        formattedBuildTime = date.toLocaleString()
      } catch (e) {
        // If parsing fails, use the raw string
        formattedBuildTime = buildTime
      }
    }
    buildTimeElement.textContent = `Built on: ${formattedBuildTime}`
  }
}

if (googleAnalyticsId !== '') {
  ReactGA.initialize(googleAnalyticsId)
}

// Update version text from package.json
updateVersionText()

// Show initial progress when React styles are loaded
updateLoadingMessage('Loading application modules...')

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
    await ndexClient.signInFromIdToken(keycloak.token)
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
      throw new Error('Cannot initialize app: Root element not found')
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
    console.warn('Failed to initialize Cytoscape:', e)
    const errorMessage = document.createElement('h2')
    errorMessage.style.color = 'red'
    errorMessage.textContent = `Failed to initialize Cytoscape: ${e.error}`
    document.body.appendChild(errorMessage)

    const errorMessageSub = document.createElement('h4')
    errorMessageSub.textContent = `Please try reloading this page. If this continues, please contact your administrator`
    document.body.appendChild(errorMessageSub)
  })
