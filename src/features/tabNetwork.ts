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

/**
 * Resolve the network this tab shows on initial load.
 *
 * Layered on {@link resolveDisplayNetworkId} to add the one case it cannot see:
 * the user asked for a specific network in the URL and importing it failed.
 * Then the requested id is kept, so the error banner explains an address the
 * user recognizes instead of the app silently redirecting to an unrelated local
 * network (CW-514).
 *
 * Keeping an unresolvable id was previously unsafe because it reached the shared
 * IndexedDB workspace row and so corrupted every tab. It cannot now:
 * `currentNetworkId` is per-tab and is stripped before that row is written (see
 * `withoutTabNetworkId` in `WorkspaceStore`).
 */
export const resolveInitialNetworkId = (
  urlNetworkId: string | undefined,
  sessionNetworkId: string | null | undefined,
  currentNetworkId: string | undefined,
  networkIds: readonly string[],
  urlImportFailed: boolean,
): string => {
  const isNetworkIdInUrl = urlNetworkId !== undefined && urlNetworkId !== ''
  if (isNetworkIdInUrl && urlImportFailed) {
    return urlNetworkId
  }

  const resolved = resolveDisplayNetworkId(
    urlNetworkId,
    sessionNetworkId,
    currentNetworkId,
    networkIds,
  )
  if (resolved !== undefined) {
    return resolved
  }

  // Nothing per-tab to go on: a genuinely new tab, or one opened at the bare
  // workspace URL. Open the workspace's first network rather than nothing.
  //
  // This fallback used to come for free from the shared `currentNetworkId`, but
  // that field is no longer persisted (it is per-tab now — see
  // `withoutTabNetworkId` in WorkspaceStore), so the shared row always reports
  // ''. Without this, every fresh tab landed on "No network selected" even
  // though the workspace had networks. Matches the fallback cross-tab hydration
  // uses when a tab's network is deleted, so both paths agree.
  return networkIds[0] ?? ''
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
