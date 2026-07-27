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
 * Not related to cross-tab data sync either: that is dexie-observable's
 * `db.on('changes')`, wired up in SyncTabs.tsx.
 *
 * History: this module used to maintain an `activeTabs` Set fed by six
 * BroadcastChannel message types (created/active/alive/inactive/closed/reload).
 * The Set was function-local and never read by anything — it could not be,
 * having no accessor — so the entire channel existed to keep a variable up to
 * date that nobody could observe. Removed. If a tab census is wanted later, it
 * needs a real consumer designed alongside it.
 */

import { logStartup } from '@/debug'

const CYWEB_PREFIX = 'cyweb'

/**
 * Returns this tab's id, reusing the existing one across reloads.
 *
 * `window.name` survives reloads and same-tab navigations, so a tab keeps its
 * identity — an external app's saved handle stays valid.
 */
/**
 * `Date.now()` alone collides when several tabs initialize in the same
 * millisecond — a session restore reopening a window full of them — and a
 * shared id means `window.open(url, tabId)` focuses whichever one the browser
 * picks. The random suffix fixes that.
 *
 * Deliberately not `crypto.randomUUID()`: that is only defined in a secure
 * context, so it throws when the app is served over plain HTTP — reaching a
 * dev server by LAN IP from another machine, for instance. This works
 * everywhere.
 */
const mintTabId = (): string =>
  `${CYWEB_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const initializeTabManager = (): string => {
  const windowName = window.name
  const tabId =
    windowName && windowName.startsWith(`${CYWEB_PREFIX}-`)
      ? windowName
      : mintTabId()

  window.name = tabId
  logStartup.info(
    `[boot]: tab id ${tabId} (use as the window.open target to focus this tab)`,
  )

  return tabId
}
