import cloneDeep from 'lodash/cloneDeep'

import { getUiStateFromDb, getWorkspaceFromDb } from '../../data/db'
import {
  DEFAULT_UI_STATE,
  useUiStateStore,
} from '../../data/hooks/stores/UiStateStore'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import type { AppShellBootContext, WorkspaceDraft } from './appShellBootContext'

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

  const workspace = await getWorkspaceFromDb()
  const summaries = await ctx.loadNetworkSummaries(workspace.networkIds)

  // Mutable copy: the record from IndexedDB is frozen.
  const dbUiState = await getUiStateFromDb()
  const uiState = cloneDeep(dbUiState ?? { ...DEFAULT_UI_STATE })

  for (const panel of [Panel.LEFT, Panel.RIGHT, Panel.BOTTOM]) {
    uiState.panels[panel] =
      (search.get(panel) as PanelState) ?? uiState.panels[panel]
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

  useUiStateStore.getState().setUi(uiState)

  return { workspace, summaries, errors: [] }
}
