import { afterEach, describe, expect, it, vi } from 'vitest'

import { logDb } from '../../debug'
import { DB_NAME, deleteDb, getDb, initializeDb } from './index'
import {
  closeProfileDb,
  deleteProfileDb,
  getProfileSetting,
  PROFILE_DB_NAME,
  putProfileSetting,
} from './profileDb'

/**
 * `deleteDb` used to return a single boolean and wait forever.
 *
 * IndexedDB will not delete a database that still has open connections: it fires
 * `blocked` and waits, with no timeout of its own. `Reset Local Workspace` hands
 * peers a 300ms grace period to let go (`src/data/db/lifecycle.ts`) and then
 * deletes regardless, so a peer whose main thread is busy — mid-parse of a large
 * network, say — leaves the delete waiting on it with nothing to bound the wait.
 * The reset dialog had no spinner and no error path, so the user saw nothing at
 * all.
 */

/** Open a plain IndexedDB connection that ignores `versionchange`. */
const openUncooperativeConnection = async (): Promise<IDBDatabase> =>
  await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    // Deliberately no onversionchange handler: Dexie installs one that closes
    // the connection, and this test needs a connection that does NOT release.
  })

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteProfileDb()
})

describe('deleteDb', () => {
  it('reports a successful delete and leaves an open database behind', async () => {
    await initializeDb()

    expect(await deleteDb()).toBe('deleted')

    const db = await getDb()
    expect(db.isOpen()).toBe(true)
  })

  it('gives up with delete-blocked when another connection holds the database', async () => {
    await initializeDb()
    const blocker = await openUncooperativeConnection()
    const warn = vi.spyOn(logDb, 'warn')

    try {
      expect(await deleteDb({ timeoutMs: 50 })).toBe('delete-blocked')
      expect(
        warn.mock.calls.some((args) =>
          String(args[0]).includes('delete is blocked'),
        ),
        'the blocked event must be reported rather than swallowed',
      ).toBe(true)
    } finally {
      // Releasing the blocker lets the still-queued delete complete.
      blocker.close()
    }

    // The delete request stays queued in IndexedDB after we stop waiting for
    // it, which is exactly why the caller must not keep writing: it lands as
    // soon as the blocker lets go.
    await initializeDb()
  })
})

/**
 * Browser-level settings live in a second database so that no workspace reset
 * takes them along (#705, #849). `deleteDb` is what every reset path calls.
 */
describe('deleteDb and the profile database', () => {
  it('leaves browser-level settings in place', async () => {
    await initializeDb()
    await putProfileSetting('llmQueryOptions', { provider: 'ollama' })

    expect(await deleteDb()).toBe('deleted')

    expect(await getProfileSetting('llmQueryOptions')).toEqual({
      provider: 'ollama',
    })
  })

  it('keeps dexie-observable out of the profile database', async () => {
    // `./index` has loaded dexie-observable by now, and it attaches itself to
    // every Dexie instance that does not opt out.
    await initializeDb()
    await putProfileSetting('k', 'v')
    closeProfileDb()

    const stores = await new Promise<string[]>((resolve, reject) => {
      const request = indexedDB.open(PROFILE_DB_NAME)
      request.onsuccess = () => {
        const names = Array.from(request.result.objectStoreNames)
        request.result.close()
        resolve(names)
      }
      request.onerror = () => reject(request.error)
    })

    expect(stores).toEqual(['settings'])
  })
})
