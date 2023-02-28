import { KeycloakTokenParsed } from 'keycloak-js'
import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CredentialStore {
  token: string
  tokenParsed: KeycloakTokenParsed
}

interface CredentialActions {
  setToken: (token: string, tokenParsed: KeycloakTokenParsed) => void
  delete: () => void
}

export const useCredentialStore = create(
  immer<CredentialStore & CredentialActions>((set) => ({
    token: '',
    tokenParsed: {},
    setToken: (token: string, tokenParsed: KeycloakTokenParsed) => {
      set((state) => {
        state.token = token
        state.tokenParsed = tokenParsed
      })
    },
    delete: () => {
      set((state) => {
        state.token = ''
        state.tokenParsed = {}
      })
    },
  })),
)
