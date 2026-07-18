/**
 * Pure decision logic for {@link SyncTabsAction}.
 *
 * Extracted so the cross-tab reload rules can be unit-tested without a DOM /
 * visibilitychange harness. See CW-652.
 */

/**
 * Decide whether a tab that just became visible again should force a full page
 * reload to pick up changes another tab may have written to the shared IndexedDB.
 *
 * The reload only makes sense when *another* tab has written to the shared DB
 * after this tab was last hidden. Two cases must NOT trigger a reload:
 *
 * - `dbTimestamp === undefined`: no cross-tab write has ever been recorded, so
 *   there is nothing to resync. Previously the code used `dbTimestamp ?? Date.now()`,
 *   which treated a never-written timestamp as "infinitely new" and reloaded on
 *   every single refocus of an empty/never-saved tab (CW-652).
 * - `hasData === false`: the workspace has no networks in this tab, so there is
 *   nothing for a cross-tab change to resync into — reloading an empty tab is pure
 *   churn.
 *
 * @param dbTimestamp   last cross-tab write time from IndexedDB, or `undefined`
 *                      if the timestamp table has never been written
 * @param localTimestamp time this tab was last hidden (0 if never hidden)
 * @param hasData       whether this tab's workspace currently holds any networks
 */
export const shouldReloadOnRefocus = (
  dbTimestamp: number | undefined,
  localTimestamp: number,
  hasData: boolean,
): boolean => {
  if (dbTimestamp === undefined) {
    return false
  }
  if (!hasData) {
    return false
  }
  return dbTimestamp > localTimestamp
}
