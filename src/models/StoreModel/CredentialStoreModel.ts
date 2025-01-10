import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'

export interface CredentialState {
  client: Keycloak
}

export interface CredentialActions {
  setClient: (client: Keycloak) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>
}

export type CredentialStore = CredentialState & CredentialActions
