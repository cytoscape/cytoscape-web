import { Avatar, Tooltip } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { ReactElement, useContext, useState } from 'react'

import { AppConfigContext } from '../../AppConfigContext'
import { logApi } from '../../debug'
import { KeycloakContext } from '../../init/keycloak'
import { LoginPanel } from './LoginPanel'

export const LoginButton = (): ReactElement => {
  const [open, setOpen] = useState<boolean>(false)

  const client: Keycloak = useContext(KeycloakContext)
  const { urlBaseName } = useContext(AppConfigContext)
  const enabled = true
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
            logApi.info(
              `[${LoginButton.name}]:[${handleClose.name}]: Login success`,
              result,
            )
          })
          .catch((error: any) => {
            logApi.error(
              `[${LoginButton.name}]:[${handleClose.name}]: Failed to login`,
              error,
            )
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
        redirectUri: window.location.origin + urlBaseName,
      })
      .then(() => {
        logApi.info(
          `[${LoginButton.name}]:[${handleLogout.name}]: Logout success`,
        )
      })
      .catch((error: any) => {
        logApi.error(
          `[${LoginButton.name}]:[${handleLogout.name}]: Failed to logout`,
          error,
        )
      })
  }

  const parsed: KeycloakTokenParsed = client.tokenParsed ?? {}
  const tooltipTitle =
    parsed.name === undefined ? 'Click to login' : parsed.name
  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Avatar
          data-testid="login-button"
          sx={{
            bgcolor: parsed.name === undefined ? '#DDDDDD' : deepOrange[400],
            marginLeft: '0.5em',
            width: 32,
            height: 32,
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
