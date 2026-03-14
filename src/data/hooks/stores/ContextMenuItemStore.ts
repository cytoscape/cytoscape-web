// src/data/hooks/stores/ContextMenuItemStore.ts
// Zustand store for context menu items registered by external apps.
// No persistence — items are re-registered on each app mount.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type {
  ContextMenuItemStoreModel,
  RegisteredContextMenuItem,
} from '../../../models/StoreModel/ContextMenuItemStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

export const useContextMenuItemStore = create(
  immer<ContextMenuItemStoreModel>((set) => ({
    items: [],

    addItem(item: RegisteredContextMenuItem) {
      set((state) => {
        state.items.push(item)
        return state
      })
    },

    removeItem(itemId: string) {
      set((state) => {
        state.items = state.items.filter((item) => item.itemId !== itemId)
        return state
      })
    },

    removeAllByAppId(appId: string) {
      set((state) => {
        // Only remove items with a matching appId.
        // Items with appId === undefined (anonymous registrations via
        // window.CyWebApi.contextMenu) are never removed by this action.
        state.items = state.items.filter(
          (item) => item.appId === undefined || item.appId !== appId,
        )
        return state
      })
    },
  })),
)

// Register cleanup so appLifecycle.ts can clean up context menu items
// for a disabled/unmounted app via cleanupAllForApp(appId).
registerAppCleanup((appId) =>
  useContextMenuItemStore.getState().removeAllByAppId(appId),
)
