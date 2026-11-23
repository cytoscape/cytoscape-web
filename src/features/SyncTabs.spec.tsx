import { render as rtlRender } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getDb } from '../data/db'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { getTabId } from '@/data/tabState/tabId'
import { hydrateFromCrossTabChange } from '@/data/sync/crossTabHydration'
import {
  markCrossTabSyncReady,
  resetCrossTabSyncGateForTesting,
} from '@/data/sync/crossTabSyncGate'
import {
  reportSyncListenerFailure,
  resetCrossTabSyncHealthForTesting,
} from '@/data/sync/crossTabSyncHealth'
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

const render = (ui: ReactElement) => rtlRender(ui)

describe('SyncTabs', () => {
  /** Captures the listener SyncTabs subscribes to db.on('changes'). */
  let changesListener: ((changes: any[]) => void) | null = null
  let unsubscribe: ReturnType<typeof vi.fn>
  let channels: any[] = []

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
    resetCrossTabSyncHealthForTesting()
    useMessageStore.getState().resetMessages()

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

    vi.stubGlobal(
      'BroadcastChannel',
      vi.fn().mockImplementation(function (this: any, name: string) {
        this.name = name
        this.postMessage = vi.fn()
        this.close = vi.fn()
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

  it('opens no BroadcastChannel — db sync rides on db.on(changes)', () => {
    render(<SyncTabsAction />)

    // Database resets from other tabs are heard by the boot's document-wide
    // listener (`listenForDatabaseReset`), not here.
    expect(channels).toHaveLength(0)
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

  it('unsubscribes the db listener on unmount', async () => {
    const { unmount } = render(<SyncTabsAction />)
    await vi.waitFor(() => expect(changesListener).not.toBeNull())

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
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

  describe('telling the user sync has stopped', () => {
    it('warns when the change listener never attaches', async () => {
      // Nothing retries this, so the tab is non-syncing for its whole life and
      // has no other way to say so.
      vi.mocked(getDb).mockRejectedValue(new Error('db unavailable'))

      render(<SyncTabsAction />)

      await vi.waitFor(() =>
        expect(useMessageStore.getState().messages).toHaveLength(1),
      )
      const [message] = useMessageStore.getState().messages
      expect(message.severity).toBe('warning')
      // A condition, not an event: it must not auto-hide.
      expect(message.persistent).toBe(true)
      expect(message.message).toContain('Reload')
    })

    it('says nothing while sync is working', async () => {
      render(<SyncTabsAction />)
      await emitChanges([
        {
          type: 2,
          table: 'summaries',
          key: CURRENT_NETWORK,
          source: OTHER_TAB,
        },
      ])

      expect(useMessageStore.getState().messages).toHaveLength(0)
    })

    it('surfaces a hydration failure reported while mounted', async () => {
      render(<SyncTabsAction />)
      await vi.waitFor(() => expect(getDb).toHaveBeenCalled())

      reportSyncListenerFailure()

      await vi.waitFor(() =>
        expect(useMessageStore.getState().messages).toHaveLength(1),
      )
    })

    it('stops listening once unmounted', async () => {
      const { unmount } = render(<SyncTabsAction />)
      await vi.waitFor(() => expect(getDb).toHaveBeenCalled())
      unmount()

      reportSyncListenerFailure()

      expect(useMessageStore.getState().messages).toHaveLength(0)
    })
  })
})
