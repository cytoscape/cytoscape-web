import { createContext } from 'react'
import Keycloak from 'keycloak-js'

export const KeycloakContext = createContext<Keycloak>(new Keycloak())
