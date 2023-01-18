import React, { Suspense } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import './index.css'
import { Error } from './Error'
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from 'react-router-dom'
import AppShell from './components/AppShell'

// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import NetworkPanel from './components/NetworkPanel'
import { MessagePanel } from './components/MessagePanel'
enableMapSet()

const WorkspaceEditor = React.lazy(() => import('./components/WorkspaceEditor'))

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

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<AppShell />} errorElement={<Error />}>
      <Route
        path=":workspaceId"
        element={
          <Suspense
            fallback={<MessagePanel message={'Loading Workspace...'} />}
          >
            <WorkspaceEditor />
          </Suspense>
        }
      >
        <Route path="networks" element={<h1>Select a network</h1>} />
        <Route path="networks/:networkId" element={<NetworkPanel />} />
      </Route>
    </Route>,
  ),
)

export const App = (): React.ReactElement => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
