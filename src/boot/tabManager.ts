/**
 * Gives this browser tab a stable, addressable identity.
 *
 * The id is written to `window.name` so an external web application can focus
 * an existing Cytoscape Web tab with `window.open(url, tabId)` and push a
 * network into it, instead of spawning a new tab. That is the entire contract;
 * the predecessor set a single fixed `window.name` for every tab, which is why
 * unique ids were needed.
 *
 * NOT related to Cytoscape Desktop integration — that runs the other way
 * (OpenNetworkInCytoscapeMenuItem -> CyNDEx/CyREST) and never touches
 * window.name. A native application cannot target a named browser window at
 * all, so this could not serve a Desktop-to-Web handoff even in principle.
 *
 * This module is the ONLY `window.name` consumer. Cross-tab data sync used to
 * share it, which coupled two unrelated contracts to one script-writable global:
 * anything on the page overwriting `window.name` silently changed the tab's sync
 * identity, and "Duplicate tab" copies it, so two live tabs shared one id. Sync
 * now uses a non-persisted per-document id (`./tabId`), and the two failure modes
 * are independent — losing `window.name` costs an external app its saved handle
 * and nothing else.
 *
 * The initial name is seeded from `getTabId()` purely because it is a
 * ready-made unique string; the two values are not required to stay equal, and
 * after a reload they will not be.
 *
 * History: this module used to maintain an `activeTabs` Set fed by six
 * BroadcastChannel message types (created/active/alive/inactive/closed/reload).
 * The Set was function-local and never read by anything — it could not be,
 * having no accessor — so the entire channel existed to keep a variable up to
 * date that nobody could observe. Removed. If a tab census is wanted later, it
 * needs a real consumer designed alongside it.
 */

import { logStartup } from '@/debug'
import { CYWEB_TAB_PREFIX, getTabId } from '@/data/tabState/tabId'

/**
 * Returns this tab's addressable name, reusing the existing one across reloads.
 *
 * `window.name` survives reloads and same-tab navigations, so a tab keeps the
 * handle an external app saved. A name this app did not set is not reused — it
 * belongs to whatever wrote it.
 *
 * Degrades to the raw id if `window` is unreachable or refuses the write (a
 * hardened browsing context can); the focus contract is then unavailable, which
 * is a lost convenience rather than a failure.
 */
export const initializeTabManager = (): string => {
  const fallback = getTabId()
  let tabName = fallback

  try {
    const existing = window.name
    tabName = existing.startsWith(`${CYWEB_TAB_PREFIX}-`) ? existing : fallback
    window.name = tabName
  } catch (e) {
    logStartup.info(
      '[boot]: window.name is unavailable; this tab cannot be focused by name',
      e,
    )
  }

  logStartup.info(
    `[boot]: tab name ${tabName} (use as the window.open target to focus this tab)`,
  )

  return tabName
}
