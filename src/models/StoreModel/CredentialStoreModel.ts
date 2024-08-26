import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'

export interface CredentialStore {
  client: Keycloak
}

export interface CredentialActions {
  setClient: (client: Keycloak) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>
}

export type CredentialStoreModel = CredentialStore & CredentialActions
