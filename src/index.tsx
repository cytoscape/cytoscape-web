import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'

import './index.css'
import * as appConfig from './assets/config.json'

import AppShell from './components/AppShell'
import { AppConfigContext } from './AppConfigContext'

const theme = createTheme({
  palette: {
    primary: {
      main: '#337ab7',
    },
    secondary: {
      main: '#f50057',
    },
  },
})

const App = (): React.ReactElement => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppConfigContext.Provider value={appConfig}>
      <App />
    </AppConfigContext.Provider>
  </React.StrictMode>,
)
