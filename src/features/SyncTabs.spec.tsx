import { render as rtlRender } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeDb, getDb } from '../data/db'
import { useWorkspaceStore } from '../data/hooks/stores/WorkspaceStore'
import { getTabId } from '@/data/tabState/tabId'
import { hydrateFromCrossTabChange } from '@/data/sync/crossTabHydration'
import {
  markCrossTabSyncReady,
  resetCrossTabSyncGateForTesting,
} from '@/data/sync/crossTabSyncGate'
import {
  DATABASE_DELETED,
  DATABASE_DELETED_ACK,
  DATABASE_RESET_COMPLETE,
  RESET_COMPLETE_TIMEOUT_MS,
} from '@/data/db/lifecycle'
import { SyncTabsAction } from './SyncTabs'

vi.mock('../data/db', () => ({
  getDb: vi.fn(),
  closeDb: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/data/sync/crossTabHydration', () => ({
  hydrateFromCrossTabChange: vi.fn().mockResolvedValue(undefined),
}))

const OTHER_TAB = 'cyweb-some-other-tab'
const CURRENT_NETWORK = 'net-current'

// SyncTabs resolves the base-path-aware root href via useHref, so it needs a
// router context.
const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

describe('SyncTabs', () => {
  /** Captures the listener SyncTabs subscribes to db.on('changes'). */
  let changesListener: ((changes: any[]) => void) | null = null
  let unsubscribe: ReturnType<typeof vi.fn>
  let channels: any[] = []
  let mockClose: ReturnType<typeof vi.fn>

  const emitChanges = async (changes: any[]): Promise<void> => {
    // The subscription happens after `await getDb()`, so let that settle.
    await vi.waitFor(() => expect(changesListener).not.toBeNull())
    changesListener?.(changes)
  }

  beforeEach(() => {
    changesListener = null
    unsubscribe = vi.fn()

    // Most tests exercise steady state; the gate has its own tests below.
    resetCrossTabSyncGateForTesting()
    markCrossTabSyncReady()

    const dbOn = vi.fn(
      (_event: string, listener?: (changes: any[]) => void) => {
        if (listener !== undefined) {
          changesListener = listener
          return undefined
        }
        // db.on('changes') with no callback returns the event context
        return { unsubscribe }
      },
    )

    vi.mocked(getDb).mockResolvedValue({ on: dbOn } as any)

    mockClose = vi.fn()
    vi.stubGlobal(
      'BroadcastChannel',
      vi.fn().mockImplementation(function (this: any, name: string) {
        this.name = name
        this.postMessage = vi.fn()
        this.close = mockClose
        this.onmessage = null
        channels.push(this)
      }),
    )

    useWorkspaceStore.setState({
      workspace: {
        ...useWorkspaceStore.getState().workspace,
        currentNetworkId: CURRENT_NETWORK,
      },
    })

    // vi.stubGlobal, not Object.defineProperty: the afterEach below calls
    // vi.unstubAllGlobals(), which restores the real location. A raw
    // defineProperty leaks the stub into every later test file in the worker.
    vi.stubGlobal('location', { reload: vi.fn(), assign: vi.fn(), href: '' })
  })

  afterEach(() => {
    channels = []
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens only the ui-events channel — db sync rides on db.on(changes)', () => {
    render(<SyncTabsAction />)

    expect(channels).toHaveLength(1)
    expect(channels[0].name).toBe('cyweb-ui-events')
  })

  it('hydrates changes written by another tab', async () => {
    render(<SyncTabsAction />)

    const changes = [
      { table: 'cyNetworks', type: 2, key: CURRENT_NETWORK, source: OTHER_TAB },
    ]
    await emitChanges(changes)

    expect(hydrateFromCrossTabChange).toHaveBeenCalledWith(changes)
  })

  it('ignores this tab own writes so a tab never re-applies its own change', async () => {
    render(<SyncTabsAction />)

    await emitChanges([
      {
        table: 'cyNetworks',
        type: 2,
        key: CURRENT_NETWORK,
        source: getTabId(),
      },
    ])

    expect(hydrateFromCrossTabChange).not.toHaveBeenCalled()
  })

  it('passes only the foreign subset when a batch mixes origins', async () => {
    render(<SyncTabsAction />)

    const foreign = {
      table: 'summaries',
      type: 2,
      key: 'net-other',
      source: OTHER_TAB,
    }
    await emitChanges([
      { table: 'cyTables', type: 2, key: CURRENT_NETWORK, source: getTabId() },
      foreign,
    ])

    expect(hydrateFromCrossTabChange).toHaveBeenCalledWith([foreign])
  })

  it('skips hydration for changes unrelated to this tab current network', async () => {
    render(<SyncTabsAction />)

    await emitChanges([
      { table: 'cyTables', type: 2, key: 'net-unrelated', source: OTHER_TAB },
    ])

    expect(hydrateFromCrossTabChange).not.toHaveBeenCalled()
  })

  it('unsubscribes the db listener and closes the ui channel on unmount', async () => {
    const { unmount } = render(<SyncTabsAction />)
    await vi.waitFor(() => expect(changesListener).not.toBeNull())

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalledTimes(1)
  })

  it('does not subscribe when unmounted before getDb resolves', async () => {
    const { unmount } = render(<SyncTabsAction />)
    unmount()

    // Let the pending getDb() promise settle after teardown
    await Promise.resolve()
    await Promise.resolve()

    expect(unsubscribe).not.toHaveBeenCalled()
  })

  describe('initialization gate', () => {
    beforeEach(() => {
      // Simulate a tab whose app shell has not finished initializing.
      resetCrossTabSyncGateForTesting()
    })

    it('does not hydrate while the app shell is still initializing', async () => {
      render(<SyncTabsAction />)

      await emitChanges([
        {
          table: 'cyNetworks',
          type: 2,
          key: CURRENT_NETWORK,
          source: OTHER_TAB,
        },
      ])

      expect(hydrateFromCrossTabChange).not.toHaveBeenCalled()
    })

    it('buffers changes seen during init and hydrates them once ready', async () => {
      render(<SyncTabsAction />)

      const first = {
        table: 'cyNetworks',
        type: 2,
        key: CURRENT_NETWORK,
        source: OTHER_TAB,
      }
      const second = {
        table: 'summaries',
        type: 2,
        key: CURRENT_NETWORK,
        source: OTHER_TAB,
      }
      await emitChanges([first])
      await emitChanges([second])
      expect(hydrateFromCrossTabChange).not.toHaveBeenCalled()

      markCrossTabSyncReady()

      expect(hydrateFromCrossTabChange).toHaveBeenCalledTimes(1)
      expect(hydrateFromCrossTabChange).toHaveBeenCalledWith([first, second])
    })

    it('does not flush the buffer after unmount', async () => {
      const { unmount } = render(<SyncTabsAction />)
      await emitChanges([
        {
          table: 'cyNetworks',
          type: 2,
          key: CURRENT_NETWORK,
          source: OTHER_TAB,
        },
      ])

      unmount()
      markCrossTabSyncReady()

      expect(hydrateFromCrossTabChange).not.toHaveBeenCalled()
    })
  })

  describe('database reset handshake', () => {
    it('releases the database and acknowledges before reloading', async () => {
      render(<SyncTabsAction />)
      const uiEventsChannel = channels.find((c) => c.name === 'cyweb-ui-events')

      uiEventsChannel.onmessage({ data: { type: DATABASE_DELETED } })
      await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())

      // Connection released first, then acknowledged: until this tab lets go,
      // the deleting tab's Dexie.delete() is blocked on it.
      expect(uiEventsChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: DATABASE_DELETED_ACK }),
      )
      // Still on the page — reloading now could re-create the database while
      // the delete is in flight.
      expect(window.location.assign).not.toHaveBeenCalled()
    })

    it('reloads once the deleting tab reports the reset is complete', async () => {
      render(<SyncTabsAction />)
      const uiEventsChannel = channels.find((c) => c.name === 'cyweb-ui-events')

      uiEventsChannel.onmessage({ data: { type: DATABASE_DELETED } })
      await vi.waitFor(() =>
        expect(uiEventsChannel.postMessage).toHaveBeenCalled(),
      )

      uiEventsChannel.onmessage({ data: { type: DATABASE_RESET_COMPLETE } })

      expect(window.location.assign).toHaveBeenCalledWith('/')
    })

    it('reloads anyway if the deleting tab never reports completion', async () => {
      vi.useFakeTimers()
      try {
        render(<SyncTabsAction />)
        const uiEventsChannel = channels.find(
          (c) => c.name === 'cyweb-ui-events',
        )

        uiEventsChannel.onmessage({ data: { type: DATABASE_DELETED } })
        await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())

        vi.advanceTimersByTime(RESET_COMPLETE_TIMEOUT_MS + 1)

        expect(window.location.assign).toHaveBeenCalledWith('/')
      } finally {
        vi.useRealTimers()
      }
    })

    it('ignores its own reset announcement so the deleter does not self-reset', async () => {
      // BroadcastChannel excludes only the posting channel object, not the tab:
      // announceDatabaseReset opens its own channel, so the resetting tab's
      // SyncTabs channel receives the message too. Acting on it would close our
      // connection mid-delete and navigate away from our own reset.
      render(<SyncTabsAction />)
      const uiEventsChannel = channels.find((c) => c.name === 'cyweb-ui-events')

      uiEventsChannel.onmessage({
        data: { type: DATABASE_DELETED, tabId: getTabId() },
      })
      await Promise.resolve()
      await Promise.resolve()

      expect(closeDb).not.toHaveBeenCalled()
      expect(window.location.assign).not.toHaveBeenCalled()
    })

    it('still acts on a reset announced by another tab', async () => {
      render(<SyncTabsAction />)
      const uiEventsChannel = channels.find((c) => c.name === 'cyweb-ui-events')

      uiEventsChannel.onmessage({
        data: { type: DATABASE_DELETED, tabId: OTHER_TAB },
      })

      await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())
    })

    it('ignores unrelated ui-event messages', () => {
      render(<SyncTabsAction />)
      const uiEventsChannel = channels.find((c) => c.name === 'cyweb-ui-events')

      uiEventsChannel.onmessage({ data: { type: 'SOMETHING_ELSE' } })

      expect(closeDb).not.toHaveBeenCalled()
      expect(window.location.assign).not.toHaveBeenCalled()
    })
  })
})
