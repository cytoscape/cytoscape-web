import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DELETE_TIMEOUT_MS } from './index'
import {
  ALL_UI_EVENTS_CHANNELS,
  announceDatabaseReset,
  DATABASE_DELETED,
  DATABASE_RESET_COMPLETE,
  handleDatabaseDeleted,
  isClearLocalCacheAnnouncement,
  PEER_CLOSE_GRACE_MS,
  RESET_COMPLETE_TIMEOUT_MS,
} from './lifecycle'
import { closeProfileDb } from './profileDb'

vi.mock('./profileDb', async (importOriginal) => ({
  ...((await importOriginal()) as typeof import('./profileDb')),
  closeProfileDb: vi.fn(),
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

    await handleDatabaseDeleted(channel as unknown as BroadcastChannel, reload)
    channel.onmessage?.({ data: { type: DATABASE_RESET_COMPLETE } })

    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('cyweb.tab.networkId')).toBe('n1')
  })
})
