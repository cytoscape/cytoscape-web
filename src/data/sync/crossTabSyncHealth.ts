/**
 * Whether cross-tab sync is still working, and who to tell when it is not.
 *
 * Every failure in the sync path is contained: the listener attach has a
 * `.catch`, each batch has one, each row read and each row apply has one. That
 * containment is deliberate — a peer's bad row must never blank the app — but
 * on its own it means a tab can stop receiving other tabs' changes and say
 * nothing. A stale tab looks exactly like an idle sibling tab, right up until it
 * overwrites a row the other tab already changed.
 *
 * So failures are reported here, and `SyncTabs` turns a report into a message.
 * The copy lives there: this module is in the data layer and must not own
 * user-facing text.
 *
 * Reporting is deliberately not one-per-failure. See
 * {@link CONSECUTIVE_BATCH_FAILURE_THRESHOLD}.
 */

import { logUi } from '@/debug'

/** Why this tab stopped syncing. Both mean the same thing to the user. */
export type CrossTabSyncFailure =
  /** `db.on('changes')` was never wired up, so nothing will ever arrive. */
  | 'listener'
  /** Changes arrive but cannot be applied. */
  | 'hydration'

/**
 * How many batches must fail in a row before the user hears about it.
 *
 * One failed batch is not evidence of a broken tab: a single malformed row, a
 * network deleted mid-read, a transient IndexedDB error. Three in a row with no
 * success between them is, and by then the tab has been stale for seconds.
 *
 * A success resets the count, so a sync that merely stumbles never reaches the
 * threshold and the user is never told about a problem that fixed itself.
 */
export const CONSECUTIVE_BATCH_FAILURE_THRESHOLD = 3

type FailureListener = (reason: CrossTabSyncFailure) => void

const listeners = new Set<FailureListener>()
let consecutiveBatchFailures = 0

/**
 * Subscribe to sync giving up. Returns an unsubscribe function.
 *
 * A listener that throws must not stop the others, so each is called in its own
 * try — same rule as `crossTabSyncGate`.
 */
export const onCrossTabSyncFailed = (
  listener: FailureListener,
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const emit = (reason: CrossTabSyncFailure): void => {
  logUi.error(`[CrossTabSyncHealth] Cross-tab sync has stopped (${reason})`)
  listeners.forEach((listener) => {
    try {
      listener(reason)
    } catch (e) {
      logUi.error('[CrossTabSyncHealth] A failure listener threw', e)
    }
  })
}

/**
 * The change listener never attached, so this tab will receive nothing at all.
 *
 * Reported immediately rather than counted: there is no retry behind it and no
 * later success that could clear it.
 */
export const reportSyncListenerFailure = (): void => {
  emit('listener')
}

/** A hydration batch failed outright — nothing in it was applied. */
export const reportHydrationBatchFailure = (): void => {
  consecutiveBatchFailures += 1
  // Exactly the threshold, not at-or-above: a tab that stays broken keeps
  // failing every batch, and `>=` would emit on every one of them. Crossing the
  // line is the event worth reporting.
  if (consecutiveBatchFailures === CONSECUTIVE_BATCH_FAILURE_THRESHOLD) {
    emit('hydration')
  }
}

/**
 * A hydration batch applied something. Clears the streak, which also re-arms the
 * threshold: a tab that breaks, recovers, then breaks again is a second episode
 * and worth reporting again.
 */
export const reportHydrationBatchSuccess = (): void => {
  consecutiveBatchFailures = 0
}

/** Test-only: forget the streak and every subscriber. */
export const resetCrossTabSyncHealthForTesting = (): void => {
  consecutiveBatchFailures = 0
  listeners.clear()
}
