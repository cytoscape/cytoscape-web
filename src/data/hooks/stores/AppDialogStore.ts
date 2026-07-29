// src/data/hooks/stores/AppDialogStore.ts
//
// Zustand store for dialogs opened at runtime by external apps via
// apis.dialog.open(). No persistence — dialogs are transient UI state.
//
// Mirrors AppResourceStore: no Immer middleware, since `render` closures
// (and any React elements they capture) must remain exactly as passed.

import { create } from 'zustand'

import type { RegisteredAppDialog } from '../../../models/AppModel/RegisteredAppDialog'
import type { AppDialogStoreModel } from '../../../models/StoreModel/AppDialogStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

export const useAppDialogStore = create<AppDialogStoreModel>((set) => ({
  dialogs: [],

  openDialog(dialog: RegisteredAppDialog) {
    set((state) => {
      const idx = state.dialogs.findIndex(
        (d) => d.appId === dialog.appId && d.id === dialog.id,
      )
      if (idx >= 0) {
        const updated = [...state.dialogs]
        updated[idx] = dialog
        return { dialogs: updated }
      }
      return { dialogs: [...state.dialogs, dialog] }
    })
  },

  closeDialog(appId: string, id: string) {
    set((state) => ({
      dialogs: state.dialogs.filter((d) => !(d.appId === appId && d.id === id)),
    }))
  },

  closeAllForApp(appId: string) {
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.appId !== appId),
    }))
  },
}))

// Register cleanup so appLifecycle.ts can close any open dialogs for a
// disabled/unmounted app via cleanupAllForApp(appId).
registerAppCleanup((appId) =>
  useAppDialogStore.getState().closeAllForApp(appId),
)
