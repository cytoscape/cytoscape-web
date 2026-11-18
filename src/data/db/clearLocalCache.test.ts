import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resumeWritesForTesting } from '@/data/hooks/stores/persistenceScheduler'
import { CYWEB_DATABASE_NAMES } from './browserStorageInventory'
import { clearLocalCache, waitingForOtherTabsMessage } from './clearLocalCache'
import { initializeDb } from './index'
import { announceDatabaseReset } from './lifecycle'
import { putProfileSetting } from './profileDb'

// The real handshake waits PEER_CLOSE_GRACE_MS for peers that do not exist
// here; lifecycle.test.ts covers it. Only the call is checked.
const releasePeers = vi.fn()
vi.mock('./lifecycle', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('./lifecycle')
  return {
    ...actual,
    announceDatabaseReset: vi.fn(async () => releasePeers),
  }
})

/** Create a database by name with one row, the way any of ours would be. */
const seedDatabase = async (name: string): Promise<void> =>
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('seed')
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('seed', 'readwrite')
      tx.objectStore('seed').put('row', 'key')
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })

/** An open connection that ignores `versionchange`, so a delete blocks. */
const openUncooperativeConnection = async (
  name: string,
): Promise<IDBDatabase> =>
  await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const existingDatabaseNames = async (): Promise<string[]> =>
  (await indexedDB.databases()).map((info) => info.name ?? '')

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  releasePeers.mockClear()
  vi.mocked(announceDatabaseReset).mockClear()
})

afterEach(async () => {
  resumeWritesForTesting()
  // clearLocalCache closes the editor database; later tests expect it open.
  await initializeDb()
})

describe('clearLocalCache', () => {
  it('deletes all four databases, including the open editor and profile ones', async () => {
    await initializeDb()
    await putProfileSetting('llmQueryOptions', { model: 'x' })
    await seedDatabase('cyweb-manual-db')
    await seedDatabase('cyweb-manual-profile-db')
    for (const name of CYWEB_DATABASE_NAMES) {
      expect(await existingDatabaseNames()).toContain(name)
    }

    const result = await clearLocalCache()

    expect(result).toEqual({ status: 'cleared' })
    const remaining = await existingDatabaseNames()
    for (const name of CYWEB_DATABASE_NAMES) {
      expect(remaining).not.toContain(name)
    }
  })

  it("removes Cytoscape Web's storage keys and keeps everyone else's", async () => {
    localStorage.setItem('cyweb.onboarding', '{}')
    localStorage.setItem('cytoscapeWebCrashDataConsent', '{}')
    localStorage.setItem('cyweb-debug-enabled', 'true')
    localStorage.setItem('Dexie.Observable/latestRevision/cyweb-db', '3')
    localStorage.setItem('kc-callback-abc', '{}')
    localStorage.setItem('another-app-on-this-origin', 'keep me')
    sessionStorage.setItem('cyweb.tab.viewState', '{}')
    sessionStorage.setItem('cyweb.llm.apiKeys', '{}')
    sessionStorage.setItem('another-app-session', 'keep me')

    expect(await clearLocalCache()).toEqual({ status: 'cleared' })

    expect(Object.keys(localStorage)).toEqual(['another-app-on-this-origin'])
    expect(Object.keys(sessionStorage)).toEqual(['another-app-session'])
  })

  it('announces on both the editor and the manual channel, then releases the peers', async () => {
    await clearLocalCache()

    expect(announceDatabaseReset).toHaveBeenCalledWith({
      channels: ['cyweb-ui-events', 'cyweb-manual-ui-events'],
      clearsLocalCache: true,
    })
    expect(releasePeers).toHaveBeenCalledTimes(1)
  })

  it('waits for a blocked database, says which one, then finishes the clear', async () => {
    await seedDatabase('cyweb-manual-db')
    const blocker = await openUncooperativeConnection('cyweb-manual-db')
    localStorage.setItem('cyweb.onboarding', '{}')
    const onWaiting = vi.fn()
    let settled = false

    const clearing = clearLocalCache({ noticeAfterMs: 20, onWaiting }).then(
      (result) => {
        settled = true
        return result
      },
    )

    await vi.waitFor(() => {
      expect(onWaiting).toHaveBeenCalledWith(['cyweb-manual-db'])
    })
    // Giving up here would leave the delete queued in IndexedDB, and the
    // reload that follows would hang on its own open() behind it.
    expect(settled).toBe(false)
    // Nothing claims the clear happened while it is still waiting.
    expect(localStorage.getItem('cyweb.onboarding')).toBe('{}')
    expect(releasePeers).not.toHaveBeenCalled()

    blocker.close()

    expect(await clearing).toEqual({ status: 'cleared' })
    expect(await existingDatabaseNames()).not.toContain('cyweb-manual-db')
    expect(localStorage.getItem('cyweb.onboarding')).toBeNull()
    expect(releasePeers).toHaveBeenCalledTimes(1)
  })

  it('says nothing about waiting when no delete is blocked', async () => {
    const onWaiting = vi.fn()

    expect(await clearLocalCache({ noticeAfterMs: 20, onWaiting })).toEqual({
      status: 'cleared',
    })
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(onWaiting).not.toHaveBeenCalled()
  })
})

describe('waitingForOtherTabsMessage', () => {
  it('names the databases and tells the reader what to do', () => {
    const message = waitingForOtherTabsMessage(['cyweb-db', 'cyweb-profile-db'])

    expect(message).toContain('cyweb-db, cyweb-profile-db')
    expect(message).toContain('Close your other Cytoscape Web tabs')
  })
})
