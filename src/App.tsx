import React, { Suspense, useContext, useEffect } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import CookieConsent from 'react-cookie-consent';
import Cookies from 'js-cookie';
import { createTheme, ThemeProvider } from '@mui/material/styles'
import './index.css'
import { Error } from './Error'
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements,
} from 'react-router-dom'
// this allows immer to work with Map and Set
import { enableMapSet } from 'immer'
import { MessagePanel } from './components/Messages'
import appConfig from './assets/config.json'
import { KeycloakContext } from './bootstrap'
import { useCredentialStore } from './store/CredentialStore'
import { RedirectPanel } from './RedirectPanel'
import ErrorBoundary from './ErrorBoundary'

enableMapSet()

const AppShell = React.lazy(() => import('./components/AppShell'))
const WorkspaceEditor = React.lazy(
  () => import('./components/Workspace/WorkspaceEditor'),
)

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

const routerOpts: any = {}

if (appConfig.urlBaseName !== '') {
  routerOpts.basename = appConfig.urlBaseName
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={
        <Suspense
          fallback={<MessagePanel message="Preparing your workspace..." />}
        >
          <AppShell />
        </Suspense>
      }
      errorElement={<Error />}
    >
      <Route
        path=":workspaceId"
        element={
          <Suspense
            fallback={<MessagePanel message={'Initializing Workspace...'} />}
          >
            <WorkspaceEditor />
          </Suspense>
        }
        errorElement={<Error />}
      >
        <Route path="networks" element={<div />} errorElement={<Error />} />
        <Route
          path="networks/:networkId"
          element={<div />}
          errorElement={<Error />}
        />
        <Route path="*" element={<RedirectPanel />} />
      </Route>

      <Route path="/error" element={<Error />} />
    </Route>,
  ),
  routerOpts,
)

export const App = (): React.ReactElement => {
  const client = useContext(KeycloakContext);
  const setClient = useCredentialStore((state) => state.setClient);

  useEffect(() => {
    setClient(client);
  }, [client, setClient]);

  const removeAllCookies = () => {
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <RouterProvider router={router} />
        <CookieConsent
          location="bottom"
          buttonText="Accept"
          declineButtonText="Decline"
          enableDeclineButton
          setDeclineCookie={false}
          flipButtons 
          onDecline={removeAllCookies}
          cookieName="myAppCookieConsent"
          style={{ background: "#4F4F4F" }}
          buttonStyle={{ backgroundColor: "#0073B0", color: "#ffffff", fontSize: "13px" }}
          declineButtonStyle={{ color: "#ffffff", background: "#6c757d", fontSize: "13px" }}
          expires={150}
        >
          This site uses cookies to support Cytoscape Web’s network visualization tools and improve your experience. By accepting, you consent to our data practices.{" "}
          <a href="https://github.com/cytoscape/cytoscape-web/blob/development/privacy-policy.md" style={{ color: "#e0e0e0" }}>Learn more</a>
        </CookieConsent>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
