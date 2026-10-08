// src/data/hooks/stores/AppDialogStore.ts
//
// Zustand store for dialogs opened at runtime by external apps through
// apis.dialog.open(). No persistence — dialogs are transient UI state and
// do not survive a reload. Kept import-light (zustand only), like
// ModalLauncherStore: src/app-api/core/dialogApi.ts writes to it, and
// dialog UI must not be dragged into that chunk. AppDialogHost subscribes
// and renders one CyDialog per entry.
//
// No Immer middleware on purpose: `render` closures (and any React elements
// they capture) must remain exactly as the app passed them.

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

  closeAllByAppId(appId: string) {
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.appId !== appId),
    }))
  },
}))

// Close any open dialogs when an app is disabled/unmounted or mount() fails —
// appLifecycle.ts / useAppManager call cleanupAllForApp(appId). This module
// is guaranteed loaded before any dialog can open because dialogApi.ts
// imports it.
registerAppCleanup((appId) =>
  useAppDialogStore.getState().closeAllByAppId(appId),
)
