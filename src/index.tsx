import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import './index.css'
import * as appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
enableMapSet()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppConfigContext.Provider value={appConfig}>
      <App />
    </AppConfigContext.Provider>
  </React.StrictMode>,
)
