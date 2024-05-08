import * as ReactDOM from 'react-dom/client'
import './index.css'
import './split-pane.css'
import './data-grid.css'
import appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React, { createContext } from 'react'
import Keycloak from 'keycloak-js'
enableMapSet()

const appUrl = 'http://localhost:3000/app2.js'
// import ext1 from 'http://localhost:3000/app1.js'

async function loadModule() {
  fetch(appUrl)
    .then((response) => response.text())
    .then((text) => {
      eval(text)
    })
    .then((module) => {
      console.log('Loaded module', module)
    })
    .catch((error) => {
      console.error('!$$$$$$$$$Error loading module', error)
    })
}
async function loadModule2(moduleUrl: string) {
  try {
    const module = await import(moduleUrl)
    console.log('Loaded module', module)
  } catch (error) {
    console.error('Error loading module', error)
  }
}

loadModule2(appUrl)
  .then(() => {
    console.log('Module loaded')
  })
  .catch((error) => {
    console.error('###Error loading module', error)
  })

export const KeycloakContext = createContext<Keycloak>(new Keycloak())

const rootElement: HTMLElement | null = document.getElementById('root')
const { keycloakConfig, urlBaseName } = appConfig
const keycloak = new Keycloak(keycloakConfig)
keycloak
  .init({
    onLoad: 'check-sso',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri:
      window.location.origin + urlBaseName + 'silent-check-sso.html',
  })
  .then(() => {
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
