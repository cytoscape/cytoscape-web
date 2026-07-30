/**
 * Cross-tab handshake for destroying the IndexedDB database.
 *
 * `resetWorkspace` deletes the whole database, which every other tab still has
 * open. IndexedDB will not delete a database with live connections — it fires
 * `blocked` and waits — so the other tabs have to be told to let go first.
 *
 * The earlier version announced the deletion and then deleted immediately, while
 * the receiving tabs navigated straight to `/`. That reload could reopen (and so
 * re-create) the database while the delete was still pending, which is the
 * "ghost workspace" the announcement was added to prevent.
 *
 * The sequence now is:
 *
 * 1. deleter posts `DATABASE_DELETED`
 * 2. peers close their DB connection and post `DATABASE_DELETED_ACK`
 * 3. deleter waits a short grace period, then deletes (bounded — see
 *    `DELETE_TIMEOUT_MS` in `src/data/db/index.ts`)
 * 4. deleter posts `DATABASE_RESET_COMPLETE`, whatever the outcome was
 * 5. peers reload — against a database that is already gone and freshly created
 *
 * Every wait is bounded: a wedged or closing tab must never leave the user
 * unable to reset their workspace, and a dead deleter must never leave peers
 * stuck on a blank page. BroadcastChannel is the right transport here because
 * this is a liveness signal — there is nothing to replay, and it has to arrive
 * before the data it refers to is gone.
 *
 * The handshake makes the release prompt and observable; it is not the only
 * thing that produces one. `deleteDatabase` also fires `versionchange` at every
 * open connection, and Dexie's default handler closes the database in response,
 * so a peer that never processes the message above still lets go once its event
 * loop turns. What the handshake adds is ordering — peers reload *after* the
 * delete rather than racing it and re-creating the workspace they just dropped.
 */

import { closeDb } from '@/data/db'
import { logDb } from '@/debug'
import { getTabId } from '@/data/tabState/tabId'

export const UI_EVENTS_CHANNEL = 'cyweb-ui-events'

export const DATABASE_DELETED = 'DATABASE_DELETED'
export const DATABASE_DELETED_ACK = 'DATABASE_DELETED_ACK'
export const DATABASE_RESET_COMPLETE = 'DATABASE_RESET_COMPLETE'

/**
 * How long the deleter waits for peers to release their connections. A
 * same-origin BroadcastChannel round trip is sub-millisecond; this is generous
 * enough for a busy main thread while staying imperceptible.
 */
export const PEER_CLOSE_GRACE_MS = 300

/**
 * How long a peer waits for `DATABASE_RESET_COMPLETE` before reloading anyway,
 * in case the deleting tab was closed mid-reset.
 *
 * Must exceed the deleter's own worst case — `PEER_CLOSE_GRACE_MS` plus
 * `DELETE_TIMEOUT_MS` from `src/data/db/index.ts` — so it fires only when the
 * deleter really is gone rather than while it is still working.
 * `resetWorkspace` signals completion on every outcome (success, failure, and
 * give-up), so a peer that times out has heard nothing at all. Written as a
 * literal rather than imported from the db module: this is evaluated at module
 * load, and every test that mocks `@/data/db` would then have to supply it.
 * `lifecycle.test.ts` guards the relationship.
 *
 * Reloading early is safe but pointless: IndexedDB processes a database's
 * connection queue in order, so an `open()` issued while a delete is still
 * pending waits for that delete rather than blocking it. It just means the
 * reloading tab sits on a blank boot until the delete resolves.
 */
export const RESET_COMPLETE_TIMEOUT_MS = 6300

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Tell other tabs to release the database, and wait for them to do so.
 *
 * Returns a function to call once the deletion has finished, which releases the
 * peers to reload. Peers are not counted — there is no reliable tab census — so
 * this is a bounded best-effort wait rather than a barrier.
 */
export const announceDatabaseReset = async (): Promise<() => void> => {
  const channel = new BroadcastChannel(UI_EVENTS_CHANNEL)
  const acknowledged = new Set<string>()

  channel.onmessage = (event) => {
    if (event.data?.type === DATABASE_DELETED_ACK) {
      acknowledged.add(String(event.data.tabId))
    }
  }

  channel.postMessage({ type: DATABASE_DELETED, tabId: getTabId() })
  await delay(PEER_CLOSE_GRACE_MS)

  logDb.info(
    `[announceDatabaseReset] ${acknowledged.size} peer tab(s) released the database`,
  )

  return () => {
    try {
      channel.postMessage({ type: DATABASE_RESET_COMPLETE })
    } finally {
      channel.close()
    }
  }
}

export const isOwnResetAnnouncement = (data: any): boolean =>
  data?.tabId !== undefined && String(data.tabId) === getTabId()

/**
 * Handle another tab deleting the database: release our connection, acknowledge,
 * and reload once the reset completes.
 *
 * Callers must skip self-originated announcements — see
 * {@link isOwnResetAnnouncement}. BroadcastChannel excludes only the channel
 * OBJECT that posted, not the tab: `announceDatabaseReset` opens its own channel,
 * so the deleting tab's `SyncTabs` channel receives the message too. Acting on it
 * would make the resetting tab close its own connection mid-delete and navigate
 * away from the reset it just performed.
 */
export const handleDatabaseDeleted = async (
  channel: BroadcastChannel,
  reload: () => void,
): Promise<void> => {
  let reloaded = false
  const reloadOnce = (): void => {
    if (reloaded) {
      return
    }
    reloaded = true
    reload()
  }

  try {
    // Release the connection first: until this resolves, the other tab's
    // Dexie.delete() is blocked on us.
    await closeDb()
  } catch (e) {
    logDb.warn('[handleDatabaseDeleted] Failed to close the database', e)
  }

  try {
    channel.postMessage({ type: DATABASE_DELETED_ACK, tabId: getTabId() })
  } catch (e) {
    // The channel can already be closed if this tab is tearing down.
    logDb.warn('[handleDatabaseDeleted] Failed to acknowledge', e)
  }

  // Reload as soon as the deleter says it is finished, or after the timeout if
  // it never does.
  const timer = setTimeout(reloadOnce, RESET_COMPLETE_TIMEOUT_MS)
  const previousHandler = channel.onmessage
  channel.onmessage = (event) => {
    if (event.data?.type === DATABASE_RESET_COMPLETE) {
      clearTimeout(timer)
      reloadOnce()
      return
    }
    previousHandler?.call(channel, event)
  }
}
