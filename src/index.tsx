import * as ReactDOM from 'react-dom/client'
import './index.css'
import './split-pane.css'
import './data-grid.css'
import * as appConfig from './assets/config.json'
import { AppConfigContext } from './AppConfigContext'
import { App } from './App'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import React from 'react'
enableMapSet()

const rootElement: HTMLElement | null = document.getElementById('root')

if (rootElement !== null) {
  ReactDOM.createRoot(rootElement).render(
    <AppConfigContext.Provider value={appConfig}>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </AppConfigContext.Provider>,
  )
} else {
  throw new Error('Cannot initialize app: Root element not found')
}
