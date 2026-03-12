// src/data/hooks/stores/ContextMenuItemStore.ts
// Zustand store for context menu items registered by external apps.
// No persistence — items are re-registered on each app mount.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  ContextMenuItemStoreModel,
  RegisteredContextMenuItem,
} from '../../../models/StoreModel/ContextMenuItemStoreModel'

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
  })),
)
