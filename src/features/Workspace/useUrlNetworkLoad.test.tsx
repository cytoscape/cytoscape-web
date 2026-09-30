import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { IdType } from '@/models/IdType'

import { UrlNetworkLoader, useUrlNetworkLoad } from './useUrlNetworkLoad'

// Store persistence must not hit IndexedDB
vi.mock('@/data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

interface PendingLoad {
  networkId: IdType
  isRemoved: () => boolean
  settle: (loaded: boolean) => Promise<void>
}

/** A loader whose loads stay pending until the test settles them */
const deferredLoader = (): {
  loader: UrlNetworkLoader
  loads: PendingLoad[]
  onLoaded: ReturnType<typeof vi.fn>
} => {
  const loads: PendingLoad[] = []
  const onLoaded = vi.fn()
  const loader: UrlNetworkLoader = {
    load: (networkId, isRemoved) =>
      new Promise<boolean>((resolve) => {
        loads.push({
          networkId,
          isRemoved,
          settle: async (loaded) => {
            await act(async () => {
              resolve(loaded)
            })
          },
        })
      }),
    onLoaded,
  }
  return { loader, loads, onLoaded }
}

const renderAt = (loader: UrlNetworkLoader, urlNetworkId?: IdType) =>
  renderHook(({ id }) => useUrlNetworkLoad(id, loader), {
    initialProps: { id: urlNetworkId },
  })

describe('useUrlNetworkLoad', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().deleteAllNetworks()
    useWorkspaceStore.getState().addNetworkIds(['a', 'b'])
  })

  it('loads the network the URL names and reports it', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    renderAt(loader, 'a')

    expect(loads.map((load) => load.networkId)).toEqual(['a'])
    await loads[0].settle(true)

    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('a', true)
  })

  it('reports a failed load as well', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    renderAt(loader, 'a')

    await loads[0].settle(false)

    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('a', false)
  })

  it('loads nothing while the URL names no network', () => {
    const { loader, loads } = deferredLoader()
    const { rerender } = renderAt(loader, undefined)
    rerender({ id: '' })

    expect(loads).toHaveLength(0)
  })

  // The URL used to be ignored while a load ran, so the network it moved to
  // was never loaded.
  it('loads the network the URL moved to while a load was running', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    const { rerender } = renderAt(loader, 'a')

    rerender({ id: 'b' })
    expect(loads).toHaveLength(1)

    await loads[0].settle(true)
    expect(onLoaded).not.toHaveBeenCalled()
    expect(loads.map((load) => load.networkId)).toEqual(['a', 'b'])

    await loads[1].settle(true)
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('b', true)
  })

  // Regression: a load that settled after its network was deleted made the
  // deleted network current again, and the network the URL was redirected to
  // was never loaded.
  it('discards a load whose network was removed, then loads the redirect', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    const { rerender } = renderAt(loader, 'a')
    expect(loads[0].isRemoved()).toBe(false)

    act(() => {
      useWorkspaceStore.getState().deleteNetwork('a')
    })
    expect(loads[0].isRemoved()).toBe(true)
    rerender({ id: 'b' })

    await loads[0].settle(true)
    expect(onLoaded).not.toHaveBeenCalledWith('a', expect.anything())

    expect(loads.map((load) => load.networkId)).toEqual(['a', 'b'])
    await loads[1].settle(true)
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('b', true)
  })

  it('discards a removed network even while the URL still names it', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    renderAt(loader, 'a')

    act(() => {
      useWorkspaceStore.getState().deleteAllNetworks()
    })
    await loads[0].settle(true)

    expect(onLoaded).not.toHaveBeenCalled()
  })

  // A URL may name a network the workspace does not list (yet); only a
  // network that was listed and then left counts as removed.
  it('does not treat a network outside the workspace as removed', async () => {
    const { loader, loads, onLoaded } = deferredLoader()
    renderAt(loader, 'elsewhere')

    expect(loads[0].isRemoved()).toBe(false)
    await loads[0].settle(true)

    expect(onLoaded).toHaveBeenCalledExactlyOnceWith('elsewhere', true)
  })
})
