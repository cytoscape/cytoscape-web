import './embed.css'

import { createRoot } from 'react-dom/client'

import { applyEmbedTheme } from './embedTheme'
import { EmbedApp } from './EmbedApp'
import { readNetworkIdFromPath } from './readNetworkIdFromPath'
import { readSelectionFromSearch } from './readSelectionFromSearch'

applyEmbedTheme(document.documentElement)

const container = document.getElementById('root')
if (container !== null) {
  createRoot(container).render(
    <EmbedApp
      networkId={readNetworkIdFromPath(window.location.pathname)}
      initialSelection={readSelectionFromSearch(window.location.search)}
    />,
  )
}
