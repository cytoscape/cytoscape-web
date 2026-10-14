/**
 * Per-tab UI view state.
 *
 * The `uiState` row in IndexedDB is shared by every tab on the origin, so any
 * field kept there is a field tabs fight over. Panel open/closed states and the
 * three active tab indices are *view* state — how this viewer is looking at the
 * workspace — not document state, so they must never live in that shared row.
 *
 * Filtering them out at hydration time (the earlier approach) was not enough:
 * the shared row still carried them, so the next local UI mutation wrote this
 * tab's private layout back into it, and a newly opened tab inherited whatever
 * tab happened to write last. They are stored here instead, in `sessionStorage`,
 * which is per-tab and survives reload.
 *
 * The tab's active network id is the other piece of per-tab view state; it lives
 * in `tabNetwork.ts`, which also owns the priority rules for resolving it.
 */

import { logUi } from '@/debug'
import { Panel } from '@/models/UiModel/Panel'
import { PanelState } from '@/models/UiModel/PanelState'
import { Ui } from '@/models/UiModel'
import { TAB_VIEW_STATE_KEY } from './storageKeys'

// Re-exported for the existing unit-test import path. The constant itself lives
// in `storageKeys.ts` because Playwright cannot load this module — see there.
export { TAB_VIEW_STATE_KEY }

/** The slice of `Ui` that belongs to this tab alone. */
export interface TabViewState {
  panels: Ui['panels']
  tableActiveTabIndex: number
  networkBrowserPanelActiveTabIndex: number
  networkViewActiveTabIndex: number
}

export const DEFAULT_TAB_VIEW_STATE: TabViewState = {
  panels: {
    [Panel.LEFT]: PanelState.OPEN,
    [Panel.RIGHT]: PanelState.CLOSED,
    [Panel.BOTTOM]: PanelState.OPEN,
  },
  tableActiveTabIndex: 0,
  networkBrowserPanelActiveTabIndex: 0,
  networkViewActiveTabIndex: 0,
}

/**
 * A fresh copy of the defaults, including a fresh `panels` object.
 *
 * Every fallback path goes through this. Returning DEFAULT_TAB_VIEW_STATE
 * itself hands the caller the shared module-level object — and `panels` is
 * nested, so a caller that mutated one panel changed the defaults for every
 * later reader in the tab.
 */
const defaultTabViewState = (): TabViewState => ({
  ...DEFAULT_TAB_VIEW_STATE,
  panels: { ...DEFAULT_TAB_VIEW_STATE.panels },
})

const PANEL_STATES: readonly PanelState[] = Object.values(PanelState)

const asPanelState = (value: unknown, fallback: PanelState): PanelState =>
  PANEL_STATES.includes(value as PanelState) ? (value as PanelState) : fallback

const asTabIndex = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : fallback

/**
 * Narrow untrusted sessionStorage content to a usable shape.
 *
 * sessionStorage is user-writable and outlives a deploy, so a stored blob may
 * predate the current shape. Every field falls back to its default rather than
 * throwing — bad view state must never block startup.
 */
const parseTabViewState = (raw: string): TabViewState => {
  const parsed = JSON.parse(raw) as Partial<TabViewState> | null
  if (parsed === null || typeof parsed !== 'object') {
    return defaultTabViewState()
  }

  const panels: Partial<Ui['panels']> = parsed.panels ?? {}
  return {
    panels: {
      [Panel.LEFT]: asPanelState(
        panels[Panel.LEFT],
        DEFAULT_TAB_VIEW_STATE.panels[Panel.LEFT],
      ),
      [Panel.RIGHT]: asPanelState(
        panels[Panel.RIGHT],
        DEFAULT_TAB_VIEW_STATE.panels[Panel.RIGHT],
      ),
      [Panel.BOTTOM]: asPanelState(
        panels[Panel.BOTTOM],
        DEFAULT_TAB_VIEW_STATE.panels[Panel.BOTTOM],
      ),
    },
    tableActiveTabIndex: asTabIndex(
      parsed.tableActiveTabIndex,
      DEFAULT_TAB_VIEW_STATE.tableActiveTabIndex,
    ),
    networkBrowserPanelActiveTabIndex: asTabIndex(
      parsed.networkBrowserPanelActiveTabIndex,
      DEFAULT_TAB_VIEW_STATE.networkBrowserPanelActiveTabIndex,
    ),
    networkViewActiveTabIndex: asTabIndex(
      parsed.networkViewActiveTabIndex,
      DEFAULT_TAB_VIEW_STATE.networkViewActiveTabIndex,
    ),
  }
}

/** Read this tab's remembered view state, or defaults. */
export const getTabViewState = (): TabViewState => {
  try {
    const raw = window.sessionStorage.getItem(TAB_VIEW_STATE_KEY)
    if (raw === null || raw === '') {
      return defaultTabViewState()
    }
    return parseTabViewState(raw)
  } catch (e) {
    // sessionStorage can be unavailable (privacy mode, sandboxed iframe), and
    // a malformed blob must not break startup.
    logUi.warn('[tabViewState] Falling back to default view state', e)
    return defaultTabViewState()
  }
}

/** Extract the per-tab slice of a full `Ui` value. */
export const toTabViewState = (ui: Ui): TabViewState => ({
  panels: ui.panels,
  tableActiveTabIndex: ui.tableUi?.activeTabIndex ?? 0,
  networkBrowserPanelActiveTabIndex:
    ui.networkBrowserPanelUi?.activeTabIndex ?? 0,
  networkViewActiveTabIndex: ui.networkViewUi?.activeTabIndex ?? 0,
})

/** Remember this tab's view state across reloads. */
export const saveTabViewState = (ui: Ui): void => {
  try {
    window.sessionStorage.setItem(
      TAB_VIEW_STATE_KEY,
      JSON.stringify(toTabViewState(ui)),
    )
  } catch (e) {
    // Degrade gracefully — this is a convenience, not a source of truth. Logged
    // like the read path: a silent write failure means panels quietly stop
    // surviving reload, with nothing in the console to explain it.
    logUi.warn('[tabViewState] Failed to save view state', e)
  }
}

/**
 * Overlay a remembered per-tab view state onto a `Ui` value.
 *
 * `panels` is copied, not aliased: `tabState` may be `DEFAULT_TAB_VIEW_STATE`
 * (both `getTabViewState`'s fallback and `withoutTabViewState` pass it), and
 * callers go on to assign into `result.panels` — the boot's URL overlay does.
 * Sharing the reference let one such assignment rewrite the module-level
 * default for the rest of the session.
 */
export const applyTabViewState = (ui: Ui, tabState: TabViewState): Ui => ({
  ...ui,
  panels: { ...tabState.panels },
  tableUi: {
    ...ui.tableUi,
    activeTabIndex: tabState.tableActiveTabIndex,
  },
  networkBrowserPanelUi: {
    ...ui.networkBrowserPanelUi,
    activeTabIndex: tabState.networkBrowserPanelActiveTabIndex,
  },
  networkViewUi: {
    ...ui.networkViewUi,
    activeTabIndex: tabState.networkViewActiveTabIndex,
  },
})

/**
 * Strip this tab's private view state from a `Ui` before it goes to the shared
 * IndexedDB row, replacing each field with its default.
 *
 * Defaults rather than omission so the stored row still satisfies
 * `validateStoredUiState`, and so a tab that reads the row before its own
 * sessionStorage exists (a genuinely new tab) starts from a sane layout instead
 * of inheriting a stranger's.
 */
export const withoutTabViewState = (ui: Ui): Ui => ({
  ...applyTabViewState(ui, DEFAULT_TAB_VIEW_STATE),
  // Transient per-tab signals: an error dialog raised in one tab must not pop
  // up in every other tab after a reload.
  activeNetworkView: '',
  enablePopup: false,
  showErrorDialog: false,
  errorMessage: '',
})
