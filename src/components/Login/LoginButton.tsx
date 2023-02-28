import { Avatar, Tooltip } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { ReactElement, useEffect, useRef, useState } from 'react'
import { LoginPanel } from './LoginPanel'
import * as appConfig from '../../assets/config.json'
import { useCredentialStore } from '../../store/CredentialStore'
import { debounce } from 'lodash'

export const LoginButton = (): ReactElement => {
  const initializing = useRef<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [enabled, setEnabled] = useState<boolean>(false)
  const [client, setClient] = useState<Keycloak>()
  const setToken = useCredentialStore((state) => state.setToken)
  const deleteToken = useCredentialStore((state) => state.delete)
  const tokenParsed: KeycloakTokenParsed = useCredentialStore(
    (state) => state.tokenParsed,
  )
  const token: string = useCredentialStore((state) => state.token)

  useEffect(() => {
    if (initializing.current) {
      console.log('Initialization in progress...')
      return
    }
    initializing.current = true
    const { keycloakConfig } = appConfig
    const keycloak = new Keycloak({ ...keycloakConfig })
    setClient(keycloak)
    keycloak
      .init({
        onLoad: 'check-sso',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + '/silent-check-sso.html',
      })
      .then((authenticated) => {
        console.info(
          'Keycloak initialized. Is authenticated?',
          authenticated,
          client,
        )
        if (authenticated && keycloak.tokenParsed !== undefined) {
          setToken(keycloak.token ?? '', keycloak.tokenParsed)
        }
        setEnabled(true)
        debounce(() => {
          initializing.current = false
        }, 1000)
      })
      .catch((e) => {
        console.warn('Failed to initialize Keycloak client:', e)
      })
  }, [])

  const handleClose = (): void => {
    if (!enabled) {
      // Button is not ready yet
      return
    }

    const authenticated: boolean = client?.authenticated ?? false

    if (!open) {
      if (token !== undefined && authenticated) {
        setOpen(true)
      } else if (!authenticated) {
        // Need to login
        client
          ?.login()
          .then((result) => {
            console.log('* Login success', result)
            const tokenParsed = client.tokenParsed ?? {}
            const token = client.token ?? ''
            setToken(token, tokenParsed)
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
      ?.logout()
      .then(() => {
        deleteToken()
      })
      .catch((error: any) => {
        console.warn('Failed to logout', error)
      })
  }

  const tooltipTitle =
    tokenParsed.name === undefined ? 'Click to login' : tokenParsed.name
  console.log('Current token', token)
  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Avatar
          sx={{
            bgcolor:
              tokenParsed.name === undefined ? '#DDDDDD' : deepOrange[300],
            marginLeft: 2,
            width: '32',
            height: '32',
          }}
          onClick={handleClose}
        />
      </Tooltip>
      <LoginPanel
        open={open}
        handleClose={handleClose}
        token={tokenParsed}
        handleLogout={handleLogout}
      />
    </>
  )
}
