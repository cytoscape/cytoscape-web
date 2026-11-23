import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTabId } from '@/data/tabState/tabId'
import { closeDb } from './index'
import {
  DATABASE_DELETED,
  DATABASE_DELETED_ACK,
  DATABASE_RESET_COMPLETE,
  listenForDatabaseReset,
  RESET_COMPLETE_TIMEOUT_MS,
} from './lifecycle'

vi.mock('./index', () => ({
  closeDb: vi.fn().mockResolvedValue(undefined),
}))

const OTHER_TAB = 'cyweb-some-other-tab'

/**
 * The document-lifetime listener the boot installs
 * (`src/boot/databaseResetListener.ts`). These were SyncTabs' tests when the
 * editor alone listened; the boot now listens for every screen.
 */
describe('listenForDatabaseReset', () => {
  let channels: any[] = []
  const reload = vi.fn()
  let stop: () => void = () => {}

  beforeEach(() => {
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
  })

  afterEach(() => {
    stop()
    channels = []
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  const listen = (): any => {
    stop = listenForDatabaseReset(reload)
    return channels.find((c) => c.name === 'cyweb-ui-events')
  }

  it('releases the database and acknowledges before reloading', async () => {
    const channel = listen()

    channel.onmessage({ data: { type: DATABASE_DELETED } })
    await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())

    // Connection released first, then acknowledged: until this tab lets go,
    // the deleting tab's Dexie.delete() is blocked on it.
    expect(channel.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: DATABASE_DELETED_ACK }),
    )
    // Still on the page: reloading now could re-create the database while the
    // delete is in flight.
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once the deleting tab reports the reset is complete', async () => {
    const channel = listen()

    channel.onmessage({ data: { type: DATABASE_DELETED } })
    await vi.waitFor(() => expect(channel.postMessage).toHaveBeenCalled())
    channel.onmessage({ data: { type: DATABASE_RESET_COMPLETE } })

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads anyway if the deleting tab never reports completion', async () => {
    vi.useFakeTimers()
    try {
      const channel = listen()

      channel.onmessage({ data: { type: DATABASE_DELETED } })
      await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())
      vi.advanceTimersByTime(RESET_COMPLETE_TIMEOUT_MS + 1)

      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores its own reset announcement so the deleter does not self-reset', async () => {
    // BroadcastChannel excludes only the posting channel object, not the tab:
    // announceDatabaseReset opens its own channel, so the resetting tab's
    // listener receives the message too. Acting on it would close our
    // connection mid-delete and navigate away from our own reset.
    const channel = listen()

    channel.onmessage({ data: { type: DATABASE_DELETED, tabId: getTabId() } })
    await Promise.resolve()
    await Promise.resolve()

    expect(closeDb).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('still acts on a reset announced by another tab', async () => {
    const channel = listen()

    channel.onmessage({ data: { type: DATABASE_DELETED, tabId: OTHER_TAB } })

    await vi.waitFor(() => expect(closeDb).toHaveBeenCalled())
  })

  it('ignores unrelated ui-event messages', () => {
    const channel = listen()

    channel.onmessage({ data: { type: 'SOMETHING_ELSE' } })

    expect(closeDb).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('stops listening when asked', () => {
    const channel = listen()

    stop()

    expect(channel.close).toHaveBeenCalledTimes(1)
  })
})
