import * as ReactDOM from 'react-dom/client'
import './index.css'
import * as appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'
import { keycloak } from './auth/keycloak'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import { KeycloakContext } from './auth/KeycloakContext'
enableMapSet()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AppConfigContext.Provider value={appConfig}>
    <KeycloakContext.Provider value={{ client: keycloak }}>
      <App />
    </KeycloakContext.Provider>
  </AppConfigContext.Provider>,
)
