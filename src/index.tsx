import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'

import './index.css'

const theme = createTheme({
  palette: {
    primary: {
      main: '#337ab7',
    },
    secondary: {
      main: '#f50057',
    },
  },
  // components: {
  //   // Name of the component
  //   MuiButtonBase: {
  //     defaultProps: {
  //       // The props to change the default for.
  //       disableRipple: true, // No more ripple, on the whole application 💣!
  //     },
  //   },
  //   MuiAppBar: {
  //     styleOverrides: {
  //       colorInherit: {
  //         backgroundColor: '#2C2C2C',
  //         color: '#fff',
  //       },
  //     },
  //   },
  // },
})

const App = (): React.ReactElement => {
  return (
    <>
      <ThemeProvider theme={theme}></ThemeProvider>
      <CssBaseline />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
