import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'

export interface CredentialState {
  client: Keycloak

  /**
   * False while the boot sequence's SSO check is still in flight (between
   * beginAuthInitialization and completeAuthInitialization). Defaults to true
   * so consumers outside the boot flow (tests, external apps) are never gated.
   */
  authInitialized: boolean
}

export interface CredentialActions {
  setClient: (client: Keycloak) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>

  /**
   * Called once at boot, before the app renders, so getToken/getParsedToken
   * wait for the SSO check instead of resolving to an anonymous token while
   * authentication is still pending.
   */
  beginAuthInitialization: () => void

  /**
   * Releases callers waiting in getToken/getParsedToken. Called from every
   * terminal path of the boot SSO check (success, failure, timeout);
   * idempotent.
   */
  completeAuthInitialization: () => void
}

export type CredentialStore = CredentialState & CredentialActions
