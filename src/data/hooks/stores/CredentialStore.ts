/**
 * @deprecated The Module Federation exposure of this store (cyweb/CredentialStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/CredentialStore Module Federation export will be removed after 2 release cycles.
 */
import Keycloak from 'keycloak-js'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { CredentialStore } from '../../../models/StoreModel/CredentialStoreModel'
import * as CredentialStoreImpl from '../../../models/StoreModel/impl/credentialStoreImpl'

interface Deferred {
  promise: Promise<void>
  resolve: () => void
}

const createDeferred = (): Deferred => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

// Kept at module scope rather than in store state so Immer never drafts the
// live Promise/resolver pair. Non-null only while the boot SSO check is
// pending (between beginAuthInitialization and completeAuthInitialization).
let authReadyDeferred: Deferred | null = null

export const useCredentialStore = create(
  immer<CredentialStore>((set, get) => ({
    client: new Keycloak(),
    authInitialized: true,
    setClient: (client: Keycloak) => {
      set((state) => {
        const newState = CredentialStoreImpl.setClient(state, client)
        state.client = newState.client
        return state
      })
    },
    beginAuthInitialization: () => {
      if (authReadyDeferred === null) {
        authReadyDeferred = createDeferred()
        set((state) => {
          state.authInitialized = false
        })
      }
    },
    completeAuthInitialization: () => {
      if (authReadyDeferred !== null) {
        authReadyDeferred.resolve()
        authReadyDeferred = null
      }
      set((state) => {
        state.authInitialized = true
      })
    },
    getToken: async () => {
      if (authReadyDeferred !== null) {
        await authReadyDeferred.promise
      }
      return CredentialStoreImpl.getToken(get())
    },
    getParsedToken: async () => {
      if (authReadyDeferred !== null) {
        await authReadyDeferred.promise
      }
      return CredentialStoreImpl.getParsedToken(get())
    },
  })),
)
