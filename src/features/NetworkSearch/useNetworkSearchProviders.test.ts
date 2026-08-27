// src/features/NetworkSearch/useNetworkSearchProviders.test.ts
//
// Provider resolution: slot filter, active-app filter, alphabetical
// sorting, and selection fallback (stored choice → first provider).

import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { RegisteredAppResource } from '../../models/AppModel/RegisteredAppResource'
import { useNetworkSearchProviderSelectionStore } from './store/networkSearchProviderSelectionStore'
import { useNetworkSearchProviders } from './useNetworkSearchProviders'

vi.mock('../../data/hooks/stores/AppStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useAppStore: create(() => ({
      apps: {} as Record<string, { status: AppStatus }>,
    })),
  }
})

function makeSearchResource(
  overrides: Partial<RegisteredAppResource> & { id: string; appId: string },
): RegisteredAppResource {
  return {
    slot: 'search-bar',
    title: overrides.id,
    onSubmit: vi.fn(),
    ...overrides,
  }
}

function seed(
  resources: RegisteredAppResource[],
  apps: Record<string, { status: AppStatus }>,
): void {
  useAppResourceStore.setState({ resources })
  useAppStore.setState({ apps } as any)
}

describe('useNetworkSearchProviders', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppResourceStore.setState({ resources: [] })
    useAppStore.setState({ apps: {} } as any)
    useNetworkSearchProviderSelectionStore.setState({
      selectedProviderId: null,
    })
  })

  it('returns no providers when nothing is registered', () => {
    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.providers).toEqual([])
    expect(result.current.selected).toBeNull()
  })

  it('always includes builtin (__builtin__) providers, with no app entry', () => {
    seed([makeSearchResource({ id: 'ndex', appId: '__builtin__' })], {})

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.providers.map((p) => p.resourceId)).toEqual([
      '__builtin__::search-bar::ndex',
    ])
  })

  it('only includes search-bar resources of active apps', () => {
    seed(
      [
        makeSearchResource({ id: 'S1', appId: 'activeApp' }),
        makeSearchResource({ id: 'S2', appId: 'inactiveApp' }),
        {
          id: 'P1',
          appId: 'activeApp',
          slot: 'right-panel',
          component: () => null,
        },
      ],
      {
        activeApp: { status: AppStatus.Active },
        inactiveApp: { status: AppStatus.Inactive },
      },
    )

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.providers.map((p) => p.resourceId)).toEqual([
      'activeApp::search-bar::S1',
    ])
  })

  it('sorts providers alphabetically by display name', () => {
    seed(
      [
        makeSearchResource({ id: 'S1', appId: 'app1', title: 'Zebra Search' }),
        makeSearchResource({ id: 'S2', appId: 'app1', title: 'Alpha Search' }),
      ],
      { app1: { status: AppStatus.Active } },
    )

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.providers.map((p) => p.name)).toEqual([
      'Alpha Search',
      'Zebra Search',
    ])
  })

  it('selects the first provider when nothing was chosen before', () => {
    seed(
      [
        makeSearchResource({ id: 'S1', appId: 'app1', title: 'Zebra' }),
        makeSearchResource({ id: 'S2', appId: 'app1', title: 'Alpha' }),
      ],
      { app1: { status: AppStatus.Active } },
    )

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.selected?.name).toBe('Alpha')
  })

  it('keeps the stored selection while its provider exists', () => {
    seed(
      [
        makeSearchResource({ id: 'S1', appId: 'app1', title: 'Zebra' }),
        makeSearchResource({ id: 'S2', appId: 'app1', title: 'Alpha' }),
      ],
      { app1: { status: AppStatus.Active } },
    )

    const { result } = renderHook(() => useNetworkSearchProviders())
    act(() => {
      result.current.selectProvider(result.current.providers[1]) // Zebra
    })

    expect(result.current.selected?.name).toBe('Zebra')
    expect(
      useNetworkSearchProviderSelectionStore.getState().selectedProviderId,
    ).toBe('app1::search-bar::S1')
  })

  it('falls back to the first provider when the stored one is gone', () => {
    seed([makeSearchResource({ id: 'S2', appId: 'app1', title: 'Alpha' })], {
      app1: { status: AppStatus.Active },
    })
    useNetworkSearchProviderSelectionStore.setState({
      selectedProviderId: 'goneApp::search-bar::gone',
    })

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.selected?.name).toBe('Alpha')
    // The stored preference is preserved: if the chosen provider's app comes
    // back, it wins again.
    expect(
      useNetworkSearchProviderSelectionStore.getState().selectedProviderId,
    ).toBe('goneApp::search-bar::gone')
  })

  it('falls back to name = id when no title was stored', () => {
    seed(
      [makeSearchResource({ id: 'S1', appId: 'app1', title: undefined })],
      { app1: { status: AppStatus.Active } },
    )

    const { result } = renderHook(() => useNetworkSearchProviders())
    expect(result.current.selected?.name).toBe('S1')
  })
})
