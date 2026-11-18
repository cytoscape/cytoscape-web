/**
 * Clear Local Cache: delete everything Cytoscape Web keeps in this browser, so
 * the next load looks like a first visit (#989).
 *
 * One function behind three doors: Help › Developer › Clear Local Cache, the
 * Error page's "Clear Cache and Reload Cytoscape" button, and the same button
 * on the boot-failure shell. The shell paints before React mounts, so this
 * module imports no React, router or Zustand code.
 *
 * What it deletes is listed in `browserStorageInventory.ts`. The NDEx sign-in
 * is not on that list: its session cookie belongs to the Keycloak domain, and
 * `check-sso` restores it after the reload.
 *
 * The caller reloads on success. This function does not, because the editor
 * needs the router's base path and the boot shell does not have a router.
 */

import { suspendWritesUntilReload } from '@/data/hooks/stores/persistenceScheduler'
import { logDb } from '@/debug'
import {
  CYWEB_DATABASE_NAMES,
  removeCywebLocalStorage,
  removeCywebSessionStorage,
} from './browserStorageInventory'
import { closeDb, DELETE_TIMEOUT_MS, deleteDatabaseBounded } from './index'
import { ALL_UI_EVENTS_CHANNELS, announceDatabaseReset } from './lifecycle'
import { closeProfileDb } from './profileDb'

export type ClearLocalCacheResult =
  /** Every database and key is gone. The caller must reload now. */
  | { status: 'cleared' }
  /**
   * At least one database could not be deleted, so the cache is not clear.
   * This tab's database connections are closed: it must not keep working on
   * in-memory state, and a retry is safe.
   */
  | { status: 'failed'; reason: string; notDeleted: string[] }

const deleteOne = async (
  name: string,
  timeoutMs: number,
): Promise<'deleted' | 'blocked' | 'failed'> => {
  try {
    return await deleteDatabaseBounded(timeoutMs, name)
  } catch (e) {
    logDb.error(`[clearLocalCache] Could not delete ${name}`, e)
    return 'failed'
  }
}

/**
 * Delete every Cytoscape Web database and storage key. Never rejects.
 *
 * Storage keys are removed only after every database is gone, so a failed
 * attempt leaves nothing that claims the cache was cleared, and the retry
 * removes them.
 */
export const clearLocalCache = async (
  options: { timeoutMs?: number } = {},
): Promise<ClearLocalCacheResult> => {
  const timeoutMs = options.timeoutMs ?? DELETE_TIMEOUT_MS
  let releasePeers: (() => void) | undefined

  try {
    // Editor and manual tabs both hold databases this deletes.
    releasePeers = await announceDatabaseReset({
      channels: ALL_UI_EVENTS_CHANNELS,
      clearsLocalCache: true,
    })

    // The stores still hold the old workspace until the reload. A delayed
    // write would re-create the database the moment it is gone.
    suspendWritesUntilReload()
    closeProfileDb()
    try {
      await closeDb()
    } catch (e) {
      // Closing an already-closed or never-opened database is not a failure.
      logDb.warn('[clearLocalCache] Could not close the database', e)
    }

    const outcomes = await Promise.all(
      CYWEB_DATABASE_NAMES.map(async (name) => ({
        name,
        outcome: await deleteOne(name, timeoutMs),
      })),
    )
    const notDeleted = outcomes
      .filter(({ outcome }) => outcome !== 'deleted')
      .map(({ name }) => name)

    if (notDeleted.length > 0) {
      const blocked = outcomes.some(({ outcome }) => outcome === 'blocked')
      logDb.error(
        `[clearLocalCache] Not deleted: ${notDeleted.join(', ')}`,
        outcomes,
      )
      return {
        status: 'failed',
        notDeleted,
        reason:
          `Could not delete ${notDeleted.join(', ')}.` +
          (blocked
            ? ' Another Cytoscape Web tab is still using it. Close your other Cytoscape Web tabs and try again.'
            : ' Please try again.'),
      }
    }

    // Before the peers are released: they read localStorage as they reload.
    const localCleared = removeCywebLocalStorage()
    const sessionCleared = removeCywebSessionStorage()
    if (!localCleared || !sessionCleared) {
      return {
        status: 'failed',
        notDeleted: [],
        reason:
          'The databases were deleted, but browser storage could not be cleared. Please try again.',
      }
    }

    logDb.info('[clearLocalCache] Local cache cleared')
    return { status: 'cleared' }
  } catch (e) {
    logDb.error('[clearLocalCache] Clearing the local cache failed', e)
    return {
      status: 'failed',
      notDeleted: [],
      reason: 'Clearing the local cache failed unexpectedly. Please try again.',
    }
  } finally {
    releasePeers?.()
  }
}
