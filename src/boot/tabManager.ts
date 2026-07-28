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
 * The id itself lives in `./tabId`, because cross-tab data sync needs the same
 * value: every Dexie transaction is stamped with it so a tab can ignore the
 * echo of its own writes (see `src/data/db/index.ts` and SyncTabs.tsx). This
 * module only announces it at boot — minting and memoizing happen there, and
 * must, since `CyDB` is constructed before boot runs.
 *
 * History: this module used to maintain an `activeTabs` Set fed by six
 * BroadcastChannel message types (created/active/alive/inactive/closed/reload).
 * The Set was function-local and never read by anything — it could not be,
 * having no accessor — so the entire channel existed to keep a variable up to
 * date that nobody could observe. Removed. If a tab census is wanted later, it
 * needs a real consumer designed alongside it.
 */

import { logStartup } from '@/debug'
import { getTabId } from './tabId'

/**
 * Returns this tab's id, reusing the existing one across reloads.
 *
 * `window.name` survives reloads and same-tab navigations, so a tab keeps its
 * identity — an external app's saved handle stays valid. `getTabId()` is what
 * reads and writes it.
 */
export const initializeTabManager = (): string => {
  const tabId = getTabId()

  logStartup.info(
    `[boot]: tab id ${tabId} (use as the window.open target to focus this tab)`,
  )

  return tabId
}
