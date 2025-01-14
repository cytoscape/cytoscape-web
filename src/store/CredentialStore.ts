import Keycloak from 'keycloak-js'
import { CredentialStore } from '../models/StoreModel/CredentialStoreModel'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

const REFRESH_MIN: number = 60 // Refresh if token expires in 1 minute

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
