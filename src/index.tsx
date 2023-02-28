import * as ReactDOM from 'react-dom/client'
import './index.css'
import * as appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React from 'react'
enableMapSet()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AppConfigContext.Provider value={appConfig}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </AppConfigContext.Provider>,
)
