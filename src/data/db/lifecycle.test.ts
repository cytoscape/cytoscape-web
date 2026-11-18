import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE_TIMEOUT_MS } from './index'
import {
  ALL_UI_EVENTS_CHANNELS,
  announceDatabaseReset,
  DATABASE_DELETED,
  DATABASE_RESET_COMPLETE,
  DATABASE_RESET_IN_PROGRESS,
  handleDatabaseDeleted,
  isClearLocalCacheAnnouncement,
  listenForDatabaseReset,
  PEER_CLOSE_GRACE_MS,
  RESET_COMPLETE_TIMEOUT_MS,
  RESET_HEARTBEAT_MS,
} from './lifecycle'
import { closeProfileDb, suspendProfileWritesUntilReload } from './profileDb'

vi.mock('./profileDb', async (importOriginal) => ({
  ...((await importOriginal()) as typeof import('./profileDb')),
  closeProfileDb: vi.fn(),
  suspendProfileWritesUntilReload: vi.fn(),
}))

describe('database reset timeouts', () => {
  /**
   * The peer fallback reload exists for a deleter that died mid-reset. If it can
   * fire while the deleter is still working, peers reload into a delete that has
   * not finished — they then sit on a blank boot waiting for it, and the reset
   * looks like a hang from both sides. `RESET_COMPLETE_TIMEOUT_MS` is a literal
   * (see lifecycle.ts), so nothing but this test keeps the two in step.
   */
  it('lets the deleter finish before a peer gives up on it', () => {
    expect(RESET_COMPLETE_TIMEOUT_MS).toBeGreaterThan(
      PEER_CLOSE_GRACE_MS + DELETE_TIMEOUT_MS,
    )
  })

  /**
   * A heartbeat delayed by a busy main thread must not let a peer reload
   * mid-clear: at least two beats fit in one timeout.
   */
  it('beats at least twice per peer timeout', () => {
    expect(RESET_HEARTBEAT_MS * 2).toBeLessThan(RESET_COMPLETE_TIMEOUT_MS)
  })
})

/** Records what each channel posted; nothing is delivered between them. */
class FakeChannel {
  static instances: FakeChannel[] = []
  posted: unknown[] = []
  closed = false
  onmessage: ((event: { data: unknown }) => void) | null = null
  constructor(readonly name: string) {
    FakeChannel.instances.push(this)
  }
  postMessage(data: unknown): void {
    this.posted.push(data)
  }
  close(): void {
    this.closed = true
  }
}

describe('Clear Local Cache handshake (#989)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeChannel.instances = []
    vi.stubGlobal('BroadcastChannel', FakeChannel)
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('announces on the editor and the manual channel, and releases both', async () => {
    const announced = announceDatabaseReset({
      channels: ALL_UI_EVENTS_CHANNELS,
      clearsLocalCache: true,
    })
    await vi.advanceTimersByTimeAsync(PEER_CLOSE_GRACE_MS)
    const release = await announced

    expect(FakeChannel.instances.map((c) => c.name)).toEqual([
      'cyweb-ui-events',
      'cyweb-manual-ui-events',
    ])
    for (const channel of FakeChannel.instances) {
      expect(channel.posted).toEqual([
        expect.objectContaining({
          type: DATABASE_DELETED,
          clearsLocalCache: true,
        }),
      ])
    }

    release()
    for (const channel of FakeChannel.instances) {
      expect(channel.posted[1]).toEqual({ type: DATABASE_RESET_COMPLETE })
      expect(channel.closed).toBe(true)
    }
  })

  it('sends heartbeats on every channel until it releases the peers', async () => {
    const announced = announceDatabaseReset({
      channels: ALL_UI_EVENTS_CHANNELS,
    })
    await vi.advanceTimersByTimeAsync(PEER_CLOSE_GRACE_MS)
    const release = await announced

    await vi.advanceTimersByTimeAsync(RESET_HEARTBEAT_MS * 3)
    for (const channel of FakeChannel.instances) {
      expect(
        channel.posted.filter(
          (m) => (m as { type?: string }).type === DATABASE_RESET_IN_PROGRESS,
        ),
      ).toHaveLength(3)
    }

    release()
    const before = FakeChannel.instances.map((c) => c.posted.length)
    await vi.advanceTimersByTimeAsync(RESET_HEARTBEAT_MS * 3)
    expect(FakeChannel.instances.map((c) => c.posted.length)).toEqual(before)
  })

  it('a peer keeps waiting while heartbeats arrive, and reloads once they stop', async () => {
    const channel = new FakeChannel('cyweb-ui-events')
    const reload = vi.fn()
    await handleDatabaseDeleted(
      channel as unknown as BroadcastChannel,
      reload,
      { clearSessionStorage: true },
    )

    // A blocked clear: well past the timeout, but the deleter is still beating.
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(RESET_HEARTBEAT_MS)
      channel.onmessage?.({ data: { type: DATABASE_RESET_IN_PROGRESS } })
    }
    expect(reload).not.toHaveBeenCalled()

    // The deleter is gone: the fallback reload still comes.
    await vi.advanceTimersByTimeAsync(RESET_COMPLETE_TIMEOUT_MS)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('tells a Clear Local Cache announcement apart from a workspace load', () => {
    expect(isClearLocalCacheAnnouncement({ clearsLocalCache: true })).toBe(true)
    expect(isClearLocalCacheAnnouncement({ clearsLocalCache: false })).toBe(
      false,
    )
    expect(isClearLocalCacheAnnouncement({ clearsLocalCache: 'true' })).toBe(
      false,
    )
    expect(isClearLocalCacheAnnouncement(null)).toBe(false)
  })

  it('a peer closes its profile database and drops its session keys just before reloading', async () => {
    sessionStorage.setItem('cyweb.tab.networkId', 'n1')
    sessionStorage.setItem('another-app-session', 'keep me')
    const channel = new FakeChannel('cyweb-ui-events')
    let keysAtReload: string[] = []
    const reload = vi.fn(() => {
      keysAtReload = Object.keys(sessionStorage)
    })

    await handleDatabaseDeleted(
      channel as unknown as BroadcastChannel,
      reload,
      { clearSessionStorage: true },
    )
    expect(closeProfileDb).toHaveBeenCalled()
    // A profile write would otherwise re-create the database being deleted.
    expect(suspendProfileWritesUntilReload).toHaveBeenCalled()
    // Not yet: the tab can still write its per-tab state until it reloads.
    expect(sessionStorage.getItem('cyweb.tab.networkId')).toBe('n1')

    channel.onmessage?.({ data: { type: DATABASE_RESET_COMPLETE } })

    expect(reload).toHaveBeenCalledTimes(1)
    expect(keysAtReload).toEqual(['another-app-session'])
  })

  it('a peer keeps its session keys when a workspace load deleted the database', async () => {
    sessionStorage.setItem('cyweb.tab.networkId', 'n1')
    const channel = new FakeChannel('cyweb-ui-events')
    const reload = vi.fn()

    vi.mocked(suspendProfileWritesUntilReload).mockClear()
    await handleDatabaseDeleted(channel as unknown as BroadcastChannel, reload)
    channel.onmessage?.({ data: { type: DATABASE_RESET_COMPLETE } })

    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('cyweb.tab.networkId')).toBe('n1')
    // Load Workspace keeps the profile database, and so its settings.
    expect(suspendProfileWritesUntilReload).not.toHaveBeenCalled()
  })

  it("a listener acts on another tab's announcement and ignores its own", async () => {
    const reload = vi.fn()
    const stop = listenForDatabaseReset(reload)
    const channel = FakeChannel.instances.at(-1)
    if (channel === undefined) throw new Error('no channel opened')

    // This tab's own announcement (same tab id): must not close our databases.
    const { getTabId } = await import('@/data/tabState/tabId')
    channel.onmessage?.({
      data: {
        type: DATABASE_DELETED,
        tabId: getTabId(),
        clearsLocalCache: true,
      },
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(channel.posted).toEqual([])

    sessionStorage.setItem('cyweb.llm.apiKeys', '{}')
    channel.onmessage?.({
      data: {
        type: DATABASE_DELETED,
        tabId: 'other-tab',
        clearsLocalCache: true,
      },
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(channel.posted).toEqual([
      expect.objectContaining({ type: 'DATABASE_DELETED_ACK' }),
    ])
    channel.onmessage?.({ data: { type: DATABASE_RESET_COMPLETE } })

    expect(reload).toHaveBeenCalledTimes(1)
    // A clear drops this tab's session keys, API keys included.
    expect(sessionStorage.getItem('cyweb.llm.apiKeys')).toBeNull()

    stop()
    expect(channel.closed).toBe(true)
  })
})
