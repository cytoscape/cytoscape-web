// src/models/StoreModel/SidePanelStoreModel.ts
//
// TypeScript interface for the SidePanelStore: which tab of the right pane
// is selected. The tabs themselves come from AppStore / AppResourceStore.

export interface SidePanelState {
  /**
   * Selection key of the selected tab (see `rightPanelResourceId`), or null
   * before anything was selected. It may name a tab that is not shown right
   * now — the side panel falls back to its first tab for display and picks
   * the selection up again if the tab comes back.
   */
  readonly selectedTabId: string | null
}

export interface SidePanelActions {
  setSelectedTabId(tabId: string | null): void
}

export type SidePanelStoreModel = SidePanelState & SidePanelActions
