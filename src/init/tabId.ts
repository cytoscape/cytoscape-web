/**
 * Per-tab identity.
 *
 * Cross-tab sync needs to know which browser tab caused a given IndexedDB
 * change, so a tab can ignore the echo of its own writes. That id is stamped
 * onto every Dexie transaction as `trans.source`, which dexie-observable
 * records on each `_changes` row (see `src/data/db/index.ts`).
 *
 * `window.name` is the storage: it is per-tab (unlike localStorage/IndexedDB)
 * and survives a reload (unlike a module-level variable alone), so a tab keeps
 * the same identity across refreshes.
 *
 * MUST stay lazy. `CyDB` is constructed at module-import time, which happens
 * before `initializeTabManager()` runs in `src/init.tsx`, so the id has to be
 * resolved when a transaction is created rather than captured at construction.
 */

export const CYWEB_TAB_PREFIX = 'cyweb'

/** Resolved once per tab, then memoized. */
let cachedTabId: string | null = null

const mintTabId = (): string =>
  // Date.now() alone collides when two tabs open in the same millisecond, so
  // mix in a random suffix. The `cyweb-` prefix is load-bearing: it is how we
  // recognize a window.name we set ourselves.
  `${CYWEB_TAB_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Stable id for this browser tab, created on first call.
 *
 * Falls back to an in-memory id where `window` is unavailable (e.g. the
 * HierarchyViewer web worker), which is correct: a worker shares no IndexedDB
 * change stream with the tabs and only needs *an* id.
 */
export const getTabId = (): string => {
  if (cachedTabId !== null) {
    return cachedTabId
  }

  try {
    const windowName = window.name
    if (windowName !== '' && windowName.startsWith(`${CYWEB_TAB_PREFIX}-`)) {
      // Reuse the id from before this reload
      cachedTabId = windowName
    } else {
      cachedTabId = mintTabId()
      window.name = cachedTabId
    }
  } catch {
    // No window (worker / sandboxed context) — degrade to a memoized id.
    cachedTabId = mintTabId()
  }

  return cachedTabId
}

/** Test-only: forget the memoized id so a test can simulate a fresh tab. */
export const resetTabIdForTesting = (): void => {
  cachedTabId = null
}
