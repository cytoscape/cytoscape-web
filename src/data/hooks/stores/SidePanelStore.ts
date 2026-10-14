// src/data/hooks/stores/SidePanelStore.ts
//
// Zustand store holding the right pane's selected tab. It lives in a store
// rather than in SidePanel's own state because the side panel is unmounted
// while the pane is closed, and src/app-api/core/panelApi.ts has to select a
// tab before opening it. No persistence — the selection never survived a
// reload. Kept import-light (zustand only), like ModalLauncherStore.

import { create } from 'zustand'

import type { SidePanelStoreModel } from '../../../models/StoreModel/SidePanelStoreModel'

export const useSidePanelStore = create<SidePanelStoreModel>((set) => ({
  selectedTabId: null,

  setSelectedTabId(tabId: string | null) {
    set({ selectedTabId: tabId })
  },
}))
