/**
 * Persistence helpers for multi-tab awareness messaging (CW-658).
 *
 * Cytoscape Web behaves like a desktop app: every browser tab on the same origin
 * shares one IndexedDB-backed workspace. Users don't expect that, so we surface:
 *
 * - a one-time, dismissable banner when a second tab is detected
 *   (`localStorage`, survives across sessions — "don't show again"), and
 * - a transient notice after a cross-tab reload
 *   (`sessionStorage` flag set just before {@link SyncTabsAction} reloads).
 */

const DISMISS_KEY = 'cyweb.multiTabNotice.dismissed'
const RELOAD_FLAG_KEY = 'cyweb.crossTabReload'

/** Whether the user has permanently dismissed the multi-tab info banner. */
export const isMultiTabNoticeDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    // localStorage may be unavailable (privacy mode) — treat as not dismissed.
    return false
  }
}

/** Permanently dismiss the multi-tab info banner. */
export const dismissMultiTabNotice = (): void => {
  try {
    window.localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // Degrade gracefully — the banner will simply reappear next time.
  }
}

/**
 * Record that this tab is about to reload because another tab changed the shared
 * workspace, so the next load can tell the user why it happened.
 */
export const flagCrossTabReload = (): void => {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, 'true')
  } catch {
    // Degrade gracefully — we just won't show the post-reload notice.
  }
}

/**
 * Read and clear the cross-tab reload flag. Returns true exactly once per reload
 * that was triggered by another tab.
 */
export const consumeCrossTabReloadFlag = (): boolean => {
  try {
    const flagged = window.sessionStorage.getItem(RELOAD_FLAG_KEY) === 'true'
    if (flagged) {
      window.sessionStorage.removeItem(RELOAD_FLAG_KEY)
    }
    return flagged
  } catch {
    return false
  }
}
