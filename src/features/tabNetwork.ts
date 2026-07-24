/**
 * Per-tab active-network resolution (CW-722).
 *
 * Cytoscape Web persists `currentNetworkId` on a single shared workspace record
 * in IndexedDB, so every browser tab on the same origin reads the same value.
 * When one tab switched networks it overwrote that shared field, and after a
 * cross-tab reload another tab would re-derive its displayed network from the
 * shared field and "swap" to the other tab's network.
 *
 * The browser already gives each tab an independent, reload-surviving store: its
 * own URL. This module resolves which network a tab should display, preferring
 * that per-tab signal, and backs it with `sessionStorage` (also per-tab, unlike
 * `localStorage`/IndexedDB) for the case where the URL carries no network id.
 */

const TAB_NETWORK_KEY = 'cyweb.tab.networkId'

const isMemberId = (
  id: string | null | undefined,
  networkIds: readonly string[],
): id is string =>
  id !== undefined && id !== null && id !== '' && networkIds.includes(id)

/**
 * Resolve which network THIS tab should display, in priority order:
 *
 * 1. `urlNetworkId` — the tab's own URL, the per-tab source of truth, when it is
 *    a member of the workspace.
 * 2. `sessionNetworkId` — a per-tab `sessionStorage` backstop (used when the URL
 *    has no network segment), when it is a member of the workspace.
 * 3. `currentNetworkId` — the shared workspace field, last resort (e.g. a brand
 *    new tab with neither of the above).
 *
 * Membership is required for the two per-tab signals because they can be stale
 * (a network may have been removed in another tab). The shared field is returned
 * as-is when nothing else resolves, preserving prior behavior (may be `''` for an
 * empty workspace).
 */
export const resolveDisplayNetworkId = (
  urlNetworkId: string | undefined,
  sessionNetworkId: string | null | undefined,
  currentNetworkId: string | undefined,
  networkIds: readonly string[],
): string | undefined => {
  if (isMemberId(urlNetworkId, networkIds)) {
    return urlNetworkId
  }
  if (isMemberId(sessionNetworkId, networkIds)) {
    return sessionNetworkId
  }
  if (isMemberId(currentNetworkId, networkIds)) {
    return currentNetworkId
  }
  return undefined
}

/** Read this tab's remembered network id from sessionStorage, if any. */
export const getTabNetworkId = (): string | undefined => {
  try {
    return window.sessionStorage.getItem(TAB_NETWORK_KEY) ?? undefined
  } catch {
    // sessionStorage can be unavailable (privacy mode, sandboxed iframe).
    return undefined
  }
}

/** Remember (or clear, when empty) this tab's active network id in sessionStorage. */
export const setTabNetworkId = (networkId: string): void => {
  try {
    if (networkId === '') {
      window.sessionStorage.removeItem(TAB_NETWORK_KEY)
    } else {
      window.sessionStorage.setItem(TAB_NETWORK_KEY, networkId)
    }
  } catch {
    // Degrade gracefully — sessionStorage is only a backstop for the URL.
  }
}
