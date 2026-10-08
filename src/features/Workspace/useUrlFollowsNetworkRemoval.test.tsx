import { act, render } from '@testing-library/react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { networkApi } from '@/app-api/core/networkApi'
import { workspaceApi } from '@/app-api/core/workspaceApi'
import { deleteNetworkFromAllStores } from '@/data/hooks/deleteNetworkOrchestrator'
import {
  clearInternalHistory,
  navigateToNetwork,
} from '@/data/hooks/navigation/urlManager'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import NetworkFn from '@/models/NetworkModel'

import { useUrlFollowsNetworkRemoval } from './useUrlFollowsNetworkRemoval'

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

const WS = 'ws-1'

/** What the router shows, refreshed on every render of the probe */
const seen = { pathname: '', navigationType: '' }

/** The router's own navigate, standing in for the user following a link */
let routerNavigate: (path: string) => void = () => undefined

/**
 * Mounted where WorkspaceEditor is — on the `:workspaceId` route, reading the
 * child route's `networkId` — so the hook sees the params the editor sees.
 */
const Probe = (): null => {
  const { networkId } = useParams()
  useUrlFollowsNetworkRemoval(networkId)
  seen.pathname = useLocation().pathname
  seen.navigationType = useNavigationType()
  routerNavigate = useNavigate()
  return null
}

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path=":workspaceId" element={<Probe />}>
          <Route path="networks" element={<div />} />
          <Route path="networks/:networkId" element={<div />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * A network the App API can delete: its data is resident, the way it is once
 * the network has been shown. The workspace-only entry (a summary that was
 * never shown) is enough for the ones that only become current.
 */
const seedLoaded = (networkId: string): void => {
  useNetworkStore
    .getState()
    .add(NetworkFn.createNetworkFromLists(networkId, [{ id: 'n1' }], []))
  useWorkspaceStore.getState().addNetworkIds(networkId)
}

/** Let the post-cascade microtask run and the router re-render */
const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('useUrlFollowsNetworkRemoval', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-30T12:00:00Z'))
    // Start clear of urlManager's 300 ms throttle and same-path memory
    clearInternalHistory()
    useNetworkStore.getState().deleteAll()
    useWorkspaceStore.getState().deleteAllNetworks()
    useWorkspaceStore.getState().setId(WS)
    seen.pathname = ''
    seen.navigationType = ''
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    clearInternalHistory()
  })

  // Regression: the App API has no router, so the URL kept naming the deleted
  // network and the network that became current was never loaded.
  it('moves the URL to the network deleteCurrentNetwork makes current', async () => {
    seedLoaded('net-1')
    useWorkspaceStore.getState().addNetworkIds('net-2')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)

    act(() => {
      expect(networkApi.deleteCurrentNetwork().success).toBe(true)
    })
    await settle()

    expect(seen.pathname).toBe(`/${WS}/networks/net-2`)
    expect(seen.navigationType).toBe('REPLACE')
  })

  // Regression: re-adding the same network (Open Sample Networks) navigated to
  // the unchanged path, so it never loaded.
  it('moves the URL to the network list after deleteAllNetworks', async () => {
    seedLoaded('net-1')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)

    act(() => {
      expect(networkApi.deleteAllNetworks().success).toBe(true)
    })
    await settle()

    expect(seen.pathname).toBe(`/${WS}/networks`)
    expect(seen.navigationType).toBe('REPLACE')
  })

  it('leaves the URL alone when another network is deleted', async () => {
    seedLoaded('net-1')
    seedLoaded('net-2')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)

    act(() => {
      expect(networkApi.deleteNetwork('net-2').success).toBe(true)
    })
    await settle()
    await advance(1000)

    expect(seen.pathname).toBe(`/${WS}/networks/net-1`)
    expect(seen.navigationType).toBe('POP')
  })

  // workspaceApi.switchCurrentNetwork does not move the URL either, so the
  // URL can name a network that is no longer current when it is deleted.
  it('follows the current network when the URL names a deleted non-current one', async () => {
    seedLoaded('net-1')
    seedLoaded('net-2')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)

    act(() => {
      expect(workspaceApi.switchCurrentNetwork('net-2').success).toBe(true)
      expect(networkApi.deleteNetwork('net-1').success).toBe(true)
    })
    await settle()

    expect(seen.pathname).toBe(`/${WS}/networks/net-2`)
  })

  // The workspace drops the id before anything repairs currentNetworkId, so
  // the hook must wait for the caller's synchronous work, not act mid-cascade.
  it('follows the current network a caller picks right after the delete', async () => {
    seedLoaded('net-1')
    seedLoaded('net-2')
    seedLoaded('net-3')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)

    // addNetworkIds prepends: net-3 is first, the orchestrator's own pick
    expect(useWorkspaceStore.getState().workspace.networkIds[0]).toBe('net-3')

    act(() => {
      deleteNetworkFromAllStores('net-1')
      useWorkspaceStore.getState().setCurrentNetworkId('net-2')
    })
    await settle()
    await advance(1000)

    expect(seen.pathname).toBe(`/${WS}/networks/net-2`)
  })

  // Acting on the value the editor mounts with would bounce a URL that names
  // a network the workspace does not hold (yet) on any workspace change.
  it('does not act on a URL network that was never in the workspace', async () => {
    seedLoaded('net-1')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/elsewhere`)

    act(() => {
      useWorkspaceStore.getState().setName('Renamed')
      expect(networkApi.deleteNetwork('net-1').success).toBe(true)
    })
    await settle()
    await advance(1000)

    expect(seen.pathname).toBe(`/${WS}/networks/elsewhere`)
  })

  // urlManager silently drops a navigation within 300 ms of the previous one
  // (urlManager.test.ts). A delete right after, say, Open Sample Networks
  // must still get the URL off the deleted network.
  it('retries a navigation urlManager throttled', async () => {
    seedLoaded('net-1')
    useWorkspaceStore.getState().addNetworkIds('net-2')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)
    // An unrelated navigation just happened
    navigateToNetwork(
      { workspaceId: WS, networkId: 'unrelated', replace: true },
      () => undefined,
    )
    await advance(100)

    act(() => {
      expect(networkApi.deleteCurrentNetwork().success).toBe(true)
    })
    await settle()
    expect(seen.pathname).toBe(`/${WS}/networks/net-1`)

    await advance(400)
    expect(seen.pathname).toBe(`/${WS}/networks/net-2`)
  })

  // The retry used to re-read whatever the URL named when it fired, so a
  // route opened in the meantime was bounced to the current network.
  it('stops retrying once the route leaves the removed network', async () => {
    seedLoaded('net-1')
    useWorkspaceStore.getState().addNetworkIds('net-2')
    useWorkspaceStore.getState().setCurrentNetworkId('net-1')
    renderAt(`/${WS}/networks/net-1`)
    navigateToNetwork(
      { workspaceId: WS, networkId: 'unrelated', replace: true },
      () => undefined,
    )
    await advance(100)

    act(() => {
      expect(networkApi.deleteCurrentNetwork().success).toBe(true)
    })
    await settle()
    // Throttled: still on the removed network, a retry is pending
    expect(seen.pathname).toBe(`/${WS}/networks/net-1`)

    // A network the workspace does not list yet, opened before the retry
    act(() => {
      routerNavigate(`/${WS}/networks/not-listed-yet`)
    })
    await advance(1000)

    expect(seen.pathname).toBe(`/${WS}/networks/not-listed-yet`)
  })
})
