// src/models/StoreModel/SidePanelStoreModel.ts
//
// TypeScript interface for the SidePanelStore: which tab of the right pane
// is selected. The tabs themselves come from AppStore / AppResourceStore.

export interface SidePanelState {
  /**
   * Selection key of the selected tab (see `rightPanelResourceId`), or null
   * before anything was selected.
   *
   * While the side panel is unmounted (right pane closed) it may name a tab
   * that is not shown right now — `panel.open` selects before opening — and
   * the panel picks it up on mount if the tab is available by then. While the
   * panel is mounted, a selected tab that gets hidden or removed is replaced
   * here by the panel's first tab (see the reset effect in `SidePanel`).
   */
  readonly selectedTabId: string | null
}

export interface SidePanelActions {
  setSelectedTabId(tabId: string | null): void
}

export type SidePanelStoreModel = SidePanelState & SidePanelActions
