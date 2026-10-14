/**
 * Readiness gate for cross-tab hydration.
 *
 * `SyncTabsAction` mounts with `AppShell`, while `initializeAppShell` is still
 * loading the workspace and writing summaries. A peer tab's change applied in
 * the middle of that would race initialization — either clobbering freshly
 * loaded state, or being clobbered by it.
 *
 * So the gate holds hydration until initialization reports done. Changes that
 * arrive in the meantime are buffered by the caller rather than dropped: a
 * change written after init's read but before the gate opens would otherwise
 * leave the tab stale until the next unrelated edit.
 */

import { logStore } from '@/debug'

let ready = false
const waiters = new Set<() => void>()

/** True once the app shell has finished initializing. */
export const isCrossTabSyncReady = (): boolean => ready

/**
 * Run `callback` when the gate opens — immediately if it already has.
 * Returns an unsubscribe function for component teardown.
 */
export const onCrossTabSyncReady = (callback: () => void): (() => void) => {
  if (ready) {
    callback()
    return () => {}
  }
  waiters.add(callback)
  return () => {
    waiters.delete(callback)
  }
}

/**
 * Open the gate. Called when app-shell initialization settles — including on
 * failure, since leaving the gate shut would disable cross-tab sync for the
 * whole session.
 */
export const markCrossTabSyncReady = (): void => {
  if (ready) {
    return
  }
  ready = true
  const pending = [...waiters]
  waiters.clear()
  // Each waiter in its own try: they are independent subscribers, and one that
  // throws must not swallow the release of every waiter registered after it.
  pending.forEach((callback) => {
    try {
      callback()
    } catch (e) {
      logStore.error('[crossTabSyncGate] A sync-ready waiter threw', e)
    }
  })
}

/** Test-only: return the gate to its pre-initialization state. */
export const resetCrossTabSyncGateForTesting = (): void => {
  ready = false
  waiters.clear()
}
