// src/features/NetworkSearch/useNetworkSearchProviders.ts
//
// Read-side view over the 'search-bar' resources in AppResourceStore:
// resolves them into typed provider entries, keeps only providers whose app
// is active, sorts them by display name, and resolves the current selection
// (last user choice if that provider still exists, first provider otherwise).

import { useAppResourceStore } from '@/data/hooks/stores/AppResourceStore'
import { useAppStore } from '@/data/hooks/stores/AppStore'
import type {
  NetworkSearchOptionsHostProps,
  NetworkSearchQuery,
} from '@/app-api/types/AppResourceTypes'
import { AppStatus } from '@/models/AppModel/AppStatus'
import type { RegisteredAppResource } from '@/models/AppModel/RegisteredAppResource'
import { BUILTIN_APP_ID } from './builtin/registerNdexNetworkSearchProvider'
import { useNetworkSearchProviderSelectionStore } from './store/networkSearchProviderSelectionStore'

/** A registered network search provider, resolved for rendering. */
export interface NetworkSearchProvider {
  readonly appId: string
  readonly id: string
  /** Full resource id (`appId::search-bar::id`) — the selection key. */
  readonly resourceId: string
  readonly name: string
  readonly description?: string
  readonly icon?: string
  readonly website?: string
  readonly placeholder?: string
  readonly optionsComponent?: React.ComponentType<NetworkSearchOptionsHostProps>
  readonly errorFallback?: unknown
  readonly onSubmit: (query: NetworkSearchQuery) => void | Promise<void>
}

export interface UseNetworkSearchProvidersResult {
  /** All visible providers, sorted alphabetically by name. */
  providers: NetworkSearchProvider[]
  /** The current provider, or null when none is registered. */
  selected: NetworkSearchProvider | null
  /** Select a provider; the choice is persisted across sessions. */
  selectProvider: (provider: NetworkSearchProvider) => void
}

export function useNetworkSearchProviders(): UseNetworkSearchProvidersResult {
  const resources = useAppResourceStore((state) => state.resources)
  const apps = useAppStore((state) => state.apps)
  const selectedProviderId = useNetworkSearchProviderSelectionStore(
    (state) => state.selectedProviderId,
  )
  const setSelectedProviderId = useNetworkSearchProviderSelectionStore(
    (state) => state.setSelectedProviderId,
  )

  const providers: NetworkSearchProvider[] = resources
    .filter(
      (r: RegisteredAppResource) =>
        r.slot === 'search-bar' &&
        // Host-provided (builtin) providers have no app lifecycle and are
        // always visible; app providers require their app to be active.
        (r.appId === BUILTIN_APP_ID ||
          apps[r.appId]?.status === AppStatus.Active),
    )
    .map(
      (r: RegisteredAppResource): NetworkSearchProvider => ({
        appId: r.appId,
        id: r.id,
        resourceId: `${r.appId}::search-bar::${r.id}`,
        name: r.title ?? r.id,
        description: r.description,
        icon: r.icon,
        website: r.website,
        placeholder: r.placeholder,
        optionsComponent: r.component as
          | React.ComponentType<NetworkSearchOptionsHostProps>
          | undefined,
        errorFallback: r.errorFallback,
        onSubmit: r.onSubmit as (
          query: NetworkSearchQuery,
        ) => void | Promise<void>,
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Last user choice wins while its provider exists; otherwise fall back to
  // the first provider (the persisted preference is kept, so the chosen
  // provider is selected again if its app comes back).
  const selected: NetworkSearchProvider | null =
    providers.find((p) => p.resourceId === selectedProviderId) ??
    providers[0] ??
    null

  const selectProvider = (provider: NetworkSearchProvider): void => {
    setSelectedProviderId(provider.resourceId)
  }

  return { providers, selected, selectProvider }
}
