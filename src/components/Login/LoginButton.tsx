import { Avatar } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import { KeycloakTokenParsed } from 'keycloak-js'
import { ReactElement, useEffect, useState } from 'react'
import { useKeycloak } from '../../auth/useKeycloak'
import { LoginPanel } from './LoginPanel'

export const LoginButton = (): ReactElement => {
  const keycloakClient = useKeycloak()
  const [open, setOpen] = useState<boolean>(false)
  const [token, setToken] = useState<KeycloakTokenParsed>()

  useEffect(() => {
    console.log('Button is ready', keycloakClient.client?.tokenParsed)

    const { client } = keycloakClient
    if (client !== undefined) {
      if (client.authenticated === true) {
        console.log('! Already logged in', client.tokenParsed)
        if (client.tokenParsed !== undefined) {
          setToken(client.tokenParsed)
        }
      } else {
        client
          .login()
          .then(() => {
            console.log('Login success', client.tokenParsed)
          })
          .catch((error) => {
            console.log('Keycloak Error', error)
          })
      }
    }
  }, [keycloakClient])

  const handleClose = (): void => {
    if (!open) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      <Avatar
        sx={{
          bgcolor: token === undefined ? '#AAAAAA' : deepOrange[300],
          marginLeft: 2,
          width: '32',
          height: '32',
        }}
        onClick={handleClose}
      />
      <LoginPanel open={open} handleClose={handleClose} token={token} />
    </>
  )
}
