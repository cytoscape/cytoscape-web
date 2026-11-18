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

import Dexie from 'dexie'

import { suspendWritesUntilReload } from '@/data/hooks/stores/persistenceScheduler'
import { logDb } from '@/debug'
import {
  CYWEB_DATABASE_NAMES,
  removeCywebLocalStorage,
  removeCywebSessionStorage,
} from './browserStorageInventory'
import { closeDb } from './index'
import { ALL_UI_EVENTS_CHANNELS, announceDatabaseReset } from './lifecycle'
import { closeProfileDb } from './profileDb'

export type ClearLocalCacheResult =
  /** Every database and key is gone. The caller must reload now. */
  | { status: 'cleared' }
  /**
   * A database could not be deleted, so the cache is not clear. This tab's
   * database connections are closed: it must not keep working on in-memory
   * state, and a retry is safe.
   */
  | { status: 'failed'; reason: string; notDeleted: string[] }

export interface ClearLocalCacheOptions {
  /**
   * Called when a delete is still waiting after `noticeAfterMs`, with the
   * databases it is waiting for, and again each time that list shrinks.
   */
  onWaiting?: (databases: readonly string[]) => void
  /** How long a delete may take before `onWaiting` fires. */
  noticeAfterMs?: number
}

/**
 * Long enough that an ordinary clear, whose peers have already closed their
 * connections, never shows the notice; short enough that a blocked one does
 * not look frozen.
 */
export const CLEAR_WAIT_NOTICE_MS = 1000

/**
 * What every entry point shows while a delete waits for another tab. The same
 * words on the menu's overlay, the Error page and the startup screen.
 */
export const waitingForOtherTabsMessage = (
  databases: readonly string[],
): string =>
  `Another tab is still using ${databases.join(', ')}. Close your other ` +
  'Cytoscape Web tabs. The cache will be cleared and Cytoscape Web will ' +
  'reload as soon as they are closed.'

/**
 * Delete one database and wait for it, however long that takes.
 *
 * No timeout, on purpose. A delete that another connection blocks stays queued
 * in IndexedDB after the caller stops waiting, and every later `open()` of that
 * database queues behind it. A tab that gave up and reloaded would then hang on
 * its own boot until the other tab let go. Waiting here, with a notice on
 * screen, is the same wait, but one the reader can see the reason for.
 */
const deleteAndWait = async (name: string): Promise<'deleted' | 'failed'> => {
  // `addons: []` keeps dexie-observable off this throwaway instance, as in
  // `deleteDatabaseBounded`.
  const deleter = new Dexie(name, { addons: [] })
  let loggedBlocked = false
  deleter.on('blocked', () => {
    if (!loggedBlocked) {
      loggedBlocked = true
      logDb.warn(
        `[clearLocalCache] ${name} delete is blocked: another connection ` +
          'still has it open. Waiting for it to close.',
      )
    }
  })
  try {
    await deleter.delete()
    return 'deleted'
  } catch (e) {
    logDb.error(`[clearLocalCache] Could not delete ${name}`, e)
    return 'failed'
  }
}

/**
 * Delete every Cytoscape Web database and storage key. Never rejects.
 *
 * Waits for as long as another tab blocks a delete, reporting it through
 * `onWaiting`, rather than giving up: see `deleteAndWait`. Storage keys are
 * removed only after every database is gone, so a failed attempt leaves
 * nothing that claims the cache was cleared, and the retry removes them.
 */
export const clearLocalCache = async (
  options: ClearLocalCacheOptions = {},
): Promise<ClearLocalCacheResult> => {
  const noticeAfterMs = options.noticeAfterMs ?? CLEAR_WAIT_NOTICE_MS
  let releasePeers: (() => void) | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined

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

    const pending = new Set<string>(CYWEB_DATABASE_NAMES)
    let noticeShown = false
    const notify = (): void => {
      noticeShown = true
      options.onWaiting?.([...pending])
    }
    noticeTimer = setTimeout(notify, noticeAfterMs)

    const outcomes = await Promise.all(
      CYWEB_DATABASE_NAMES.map(async (name) => {
        const outcome = await deleteAndWait(name)
        pending.delete(name)
        if (noticeShown && pending.size > 0) {
          notify()
        }
        return { name, outcome }
      }),
    )
    clearTimeout(noticeTimer)

    const notDeleted = outcomes
      .filter(({ outcome }) => outcome !== 'deleted')
      .map(({ name }) => name)

    if (notDeleted.length > 0) {
      logDb.error(
        `[clearLocalCache] Not deleted: ${notDeleted.join(', ')}`,
        outcomes,
      )
      return {
        status: 'failed',
        notDeleted,
        reason: `Could not delete ${notDeleted.join(', ')}. Please try again.`,
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
    clearTimeout(noticeTimer)
    releasePeers?.()
  }
}
