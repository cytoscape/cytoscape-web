import cloneDeep from 'lodash/cloneDeep'

import { getUiStateFromDb, getWorkspaceFromDb } from '@/data/db'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '@/data/hooks/stores/UiStateStore'
import type { Ui } from '@/models/UiModel'
import { Panel } from '@/models/UiModel/Panel'
import { PanelState } from '@/models/UiModel/PanelState'
import type { AppShellBootContext, WorkspaceDraft } from './appShellBootContext'

const PANEL_STATES = new Set<string>(Object.values(PanelState))

const isPanelState = (value: string): value is PanelState =>
  PANEL_STATES.has(value)

/**
 * Overlays the URL's panel and table-browser parameters on the persisted UI
 * state, returning a fresh object.
 *
 * Pure and exported so the shareable-URL semantics can be tested directly.
 * Never mutates `dbUiState` — the record from IndexedDB is frozen.
 */
export const mergeUiStateWithSearchParams = (
  dbUiState: Ui | undefined,
  search: URLSearchParams,
): Ui => {
  const uiState = cloneDeep(dbUiState ?? { ...DEFAULT_UI_STATE })

  for (const panel of [Panel.LEFT, Panel.RIGHT, Panel.BOTTOM]) {
    // Validated, not cast: these come from ?left=/?right=/?bottom= and an
    // unrecognized value would otherwise be written straight into store state.
    const requested = search.get(panel)
    if (requested !== null && isPanelState(requested)) {
      uiState.panels[panel] = requested
    }
  }

  // Applied here only. It used to be set twice — once into uiState and again
  // through setActiveTableBrowserIndex during URL-state restore — which cost
  // two putUiStateToDb writes for one value.
  const activeTableBrowserTab = search.get('activeTableBrowserTab')
  if (activeTableBrowserTab !== null) {
    const index = Number(activeTableBrowserTab)
    if (!isNaN(index) && index >= 0) {
      uiState.tableUi.activeTabIndex = index
    }
  }

  return uiState
}

/**
 * Reads the persisted workspace, its network summaries, and the UI state, then
 * applies any panel overrides from the URL.
 *
 * Cached summaries resolve straight from IndexedDB; the loader only waits on
 * the auth token if it actually has to fetch a missing one from NDEx, which is
 * why a returning user's workspace paints without waiting for the SSO check.
 */
export const loadWorkspaceState = async (
  ctx: AppShellBootContext,
): Promise<WorkspaceDraft> => {
  const { search } = ctx

  // The UI state read does not depend on either of the other two, so it
  // overlaps them rather than adding a third round-trip to the boot path.
  const [workspace, dbUiState] = await Promise.all([
    getWorkspaceFromDb(),
    getUiStateFromDb(),
  ])
  const summaries = await ctx.loadNetworkSummaries(workspace.networkIds)

  useUiStateStore
    .getState()
    .setUi(mergeUiStateWithSearchParams(dbUiState, search))

  return { workspace, summaries, errors: [] }
}
