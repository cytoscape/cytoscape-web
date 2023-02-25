import { createContext } from 'react'
import Keycloak from 'keycloak-js'

export interface KeycloakClient {
  client?: Keycloak
}

export const KeycloakContext = createContext<KeycloakClient>({})
