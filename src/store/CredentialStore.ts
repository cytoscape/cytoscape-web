import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const REFRESH_MIN: number = 60 // Refresh if token expires in 1 minute

interface CredentialState {
  client: Keycloak
}
interface CredentialActions {
  setClient: (client: Keycloak) => void
  getToken: () => Promise<string>
  getParsedToken: () => Promise<KeycloakTokenParsed>
}

export type CredentialStore = CredentialState & CredentialActions

export const useCredentialStore = create(
  immer<CredentialStore>((set, get) => ({
    client: new Keycloak(),
    setClient: (client: Keycloak) => {
      set((state) => {
        state.client = client
      })
    },
    getToken: async () => {
      const token: string | undefined = get().client.token
      if (token !== undefined) {
        await get().client.updateToken(REFRESH_MIN)
        return get().client.token ?? ''
      } else {
        return ''
      }
    },
    getParsedToken: async () => {
      const token: string | undefined = get().client.token
      if (token !== undefined) {
        await get().client.updateToken(REFRESH_MIN)
        return get().client.tokenParsed ?? {}
      } else {
        return {}
      }
    },
  })),
)
