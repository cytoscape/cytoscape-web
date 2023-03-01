import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CredentialStore {
  client: Keycloak
}

const REFRESH_MIN: number = 5

interface CredentialActions {
  setClient: (client: Keycloak) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>
}

export const useCredentialStore = create(
  immer<CredentialStore & CredentialActions>((set, get) => ({
    client: new Keycloak(),
    setClient: (client: Keycloak) => {
      set((state) => {
        state.client = client
      })
    },
    getToken: async () => {
      const currentClient = get().client
      const token: string | undefined = currentClient.token
      if (token !== undefined) {
        await currentClient.updateToken(REFRESH_MIN)
        return currentClient.token ?? ''
      } else {
        return ''
      }
    },
    getParsedToken: async () => {
      const currentClient = get().client
      const token: string | undefined = currentClient.token
      if (token !== undefined) {
        await currentClient.updateToken(REFRESH_MIN)
        return currentClient.tokenParsed ?? {}
      } else {
        return {}
      }
    },
  })),
)
