// src/features/NetworkSearch/store/networkSearchProviderSelectionStore.ts
//
// Persisted preference: the network search provider the user last selected,
// keyed by its full resource id (`appId::search-bar::id`). Stored in
// localStorage (shared across tabs) so the same provider is pre-selected on
// the next visit. Deliberately kept out of UiStateStore: this is one flat
// preference, and putting it in the Ui model would drag it through the DB
// validator, per-tab view-state overlay, and cross-tab hydration for no gain.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NetworkSearchProviderSelectionStore {
  /** Full resource id of the selected provider, or null when never chosen. */
  selectedProviderId: string | null
  setSelectedProviderId: (id: string) => void
}

export const useNetworkSearchProviderSelectionStore =
  create<NetworkSearchProviderSelectionStore>()(
    persist(
      (set) => ({
        selectedProviderId: null,
        setSelectedProviderId: (id: string) => {
          set({ selectedProviderId: id })
        },
      }),
      { name: 'cyweb-network-search' },
    ),
  )
