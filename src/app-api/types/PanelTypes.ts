// src/app-api/types/PanelTypes.ts
//
// Public types for the Panel API: open one of the workspace's collapsible
// panes and select a tab inside it.
// Design: docs/design/module-federation/specifications/panel-api-design.md

import type { ApiResult } from './ApiResult'

/**
 * One of the workspace's collapsible panes.
 *
 *   'left'   — Workspace / Style (network browser)
 *   'right'  — side panel; the pane `'right-panel'` resources render in
 *   'bottom' — table browser
 */
export type PanelId = 'left' | 'right' | 'bottom'

/** What `panel.open` did. */
export interface OpenPanelResult {
  /** The pane that is now open. */
  readonly panel: PanelId
  /** The tab that is now selected. Absent when only the pane was opened. */
  readonly tabId?: string
  /**
   * The app that owns the selected tab — tells a caller which tab won when
   * two apps registered the same id. Absent for a built-in tab.
   */
  readonly appId?: string
}

export interface PanelApi {
  /**
   * Open `panel` and, when `tabId` is given, select the tab with that id
   * inside it. Omit `tabId` to only open the pane.
   *
   * `tabId` is the id the tab was registered with (`registerPanel({ id })`,
   * a `'right-panel'` resource declaration, or a manifest panel component),
   * or one of the built-in ids in `LeftPanelTabId`, `RightPanelTabId` and
   * `BottomPanelTabId`. Only `panel` is searched. Ids are not unique across
   * apps: when several tabs of the pane share `tabId`, the calling app's own
   * tab is selected, otherwise the first one in tab order — which is always
   * what an anonymous `window.CyWebApi` caller gets.
   *
   * A tab the pane is not showing right now (its app is disabled, its
   * `requires.network` is unmet, 'llm-query' on a non-hierarchy network) does
   * not match.
   *
   * @returns `INVALID_INPUT` for an unknown `panel` or an empty `tabId`;
   * `RESOURCE_NOT_FOUND` when `panel` shows no tab with that id, in which
   * case the pane is left as it was.
   */
  open(panel: PanelId, tabId?: string): ApiResult<OpenPanelResult>
}
