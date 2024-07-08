import * as ReactDOM from 'react-dom/client'
import './index.css'
import './split-pane.css'
import './data-grid.css'
import appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

import ReactGA from 'react-ga4'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React, { createContext } from 'react'
import Keycloak from 'keycloak-js'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
enableMapSet()

export const KeycloakContext = createContext<Keycloak>(new Keycloak())
const rootElement: HTMLElement | null = document.getElementById('root')
const { keycloakConfig, urlBaseName, googleAnalyticsId, ndexBaseUrl } = appConfig

if (googleAnalyticsId !== '') {
  ReactGA.initialize(googleAnalyticsId)
}

const keycloak = new Keycloak(keycloakConfig)
keycloak
  .init({
    onLoad: 'check-sso',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri:
      window.location.origin + urlBaseName + 'silent-check-sso.html',
  })
  .then(async (result: any) => {
    const ndexClient = new NDEx(ndexBaseUrl)
    await ndexClient.signInFromIdToken(result.token);
    if (rootElement !== null) {
      ReactDOM.createRoot(rootElement).render(
        <AppConfigContext.Provider value={appConfig}>
          <React.StrictMode>
            <KeycloakContext.Provider value={keycloak}>
              <App />
            </KeycloakContext.Provider>
          </React.StrictMode>
        </AppConfigContext.Provider>,
      )
    } else {
      throw new Error('Cannot initialize app: Root element not found')
    }
  })
  .catch((e) => {
    console.warn('! Failed to initialize Keycloak client:', e)
  })
