import Keycloak from 'keycloak-js'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { CredentialStore } from '../../models/StoreModel/CredentialStoreModel'
import * as CredentialStoreImpl from '../../models/StoreModel/impl/credentialStoreImpl'

export const useCredentialStore = create(
  immer<CredentialStore>((set, get) => ({
    client: new Keycloak(),
    setClient: (client: Keycloak) => {
      set((state) => {
        const newState = CredentialStoreImpl.setClient(state, client)
        state.client = newState.client
        return state
      })
    },
    getToken: async () => {
      return CredentialStoreImpl.getToken(get())
    },
    getParsedToken: async () => {
      return CredentialStoreImpl.getParsedToken(get())
    },
  })),
)
