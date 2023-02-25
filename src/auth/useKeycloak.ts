import { useContext } from 'react'
import { KeycloakClient, KeycloakContext } from './KeycloakContext'

export const useKeycloak = (): KeycloakClient => {
  const context = useContext(KeycloakContext)
  const { client } = context

  if (client === undefined) {
    throw new Error('authClient has not been assigned to ReactKeycloakProvider')
  }

  return { client }
}
