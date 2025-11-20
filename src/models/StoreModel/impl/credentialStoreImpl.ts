import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'

export interface CredentialState {
  client: Keycloak
}

const REFRESH_MIN: number = 60 // Refresh if token expires in 1 minute

/**
 * Set a Keycloak client
 */
export const setClient = (
  state: CredentialState,
  client: Keycloak,
): CredentialState => {
  return {
    ...state,
    client,
  }
}

/**
 * Get a token from the client
 */
export const getToken = async (
  state: CredentialState,
): Promise<string> => {
  const token: string | undefined = state.client.token
  if (token !== undefined) {
    await state.client.updateToken(REFRESH_MIN)
    return state.client.token ?? ''
  } else {
    return ''
  }
}

/**
 * Get a parsed token from the client
 */
export const getParsedToken = async (
  state: CredentialState,
): Promise<KeycloakTokenParsed> => {
  const token: string | undefined = state.client.token
  if (token !== undefined) {
    await state.client.updateToken(REFRESH_MIN)
    return state.client.tokenParsed ?? {}
  } else {
    return {}
  }
}

