import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'

import './index.css'
import AppShell from './components/AppShell'
import { AppStateProvider } from './states/AppStateProvider'

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
    <>
      <AppStateProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppShell />
        </ThemeProvider>
      </AppStateProvider>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
