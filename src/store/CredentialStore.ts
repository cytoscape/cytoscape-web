import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CredentialStore {
  client: Keycloak // Keycloak client
  initialized: boolean // True if Keycloak initialization is complete
}

const REFRESH_MIN: number = 60 // Refresh if token expires in 1 minute

interface CredentialActions {
  setClient: (client: Keycloak) => void
  setInitialized: (initialized: boolean) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>
}

export const useCredentialStore = create(
  immer<CredentialStore & CredentialActions>((set, get) => ({
    client: new Keycloak(),
    initialized: false,
    setClient: (client: Keycloak) => {
      set((state) => {
        state.client = client
      })
    },
    setInitialized: (initialized: boolean) => {
      set((state) => {
        state.initialized = initialized
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
