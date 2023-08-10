import { Avatar, Tooltip } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { ReactElement, useEffect, useRef, useState, useContext } from 'react'
import { LoginPanel } from './LoginPanel'
import { useCredentialStore } from '../../store/CredentialStore'
import { AppConfigContext } from '../../AppConfigContext'

export const LoginButton = (): ReactElement => {
  const initializing = useRef<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [enabled, setEnabled] = useState<boolean>(false)

  const client: Keycloak = useCredentialStore((state) => state.client)
  const setInitialized: (initialized: boolean) => void = useCredentialStore(
    (state) => state.setInitialized,
  )

  const setClient: (client: Keycloak) => void = useCredentialStore(
    (state) => state.setClient,
  )
  const { keycloakConfig } = useContext(AppConfigContext)

  useEffect(() => {
    if (initializing.current) {
      console.log('Initialization in progress...')
      return
    }
    initializing.current = true
    const keycloak = new Keycloak({ ...keycloakConfig })
    keycloak
      .init({
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + '/silent-check-sso.html',
      })
      .then((authenticated: boolean) => {
        console.info(
          'Keycloak initialized. Is authenticated?',
          authenticated,
          client,
        )

        setClient(keycloak)
        setEnabled(true)
        setInitialized(true) // This will trigger the rendering of the rest of the app
        initializing.current = false
      })
      .catch((e) => {
        console.warn('! Failed to initialize Keycloak client:', e)
      })
  }, [])

  const handleClose = async (): Promise<void> => {
    if (!enabled) {
      // Button is not ready yet
      return
    }

    const authenticated: boolean = client?.authenticated ?? false

    if (!open) {
      const token = client?.token
      if (token !== undefined && authenticated) {
        setOpen(true)
      } else if (!authenticated) {
        // Need to login
        client
          ?.login()
          .then((result) => {
            console.log('* Login success', result)
          })
          .catch((error: any) => {
            console.warn('Failed to login', error)
          })
      }
    } else {
      setOpen(false)
    }
  }
  const handleLogout = (): void => {
    if (!enabled) {
      // Button is not ready yet
      return
    }
    client
      ?.logout({
        redirectUri: window.location.origin,
      })
      .then(() => {
        console.log('* Logout success')
      })
      .catch((error: any) => {
        console.warn('Failed to logout', error)
      })
  }

  const parsed: KeycloakTokenParsed = client.tokenParsed ?? {}
  const tooltipTitle =
    parsed.name === undefined ? 'Click to login' : parsed.name
  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Avatar
          sx={{
            bgcolor: parsed.name === undefined ? '#DDDDDD' : deepOrange[300],
            marginLeft: 2,
            width: 28,
            height: 28,
          }}
          onClick={handleClose}
        >
          {parsed.name === undefined ? null : parsed.name[0]}
        </Avatar>
      </Tooltip>
      <LoginPanel
        open={open}
        handleClose={handleClose}
        token={parsed}
        handleLogout={handleLogout}
      />
    </>
  )
}
