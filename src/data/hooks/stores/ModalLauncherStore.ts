// src/data/hooks/stores/ModalLauncherStore.ts
//
// Zustand store tracking which 'modal-launcher' resources are open.
// No persistence — open modals do not survive a reload. Kept import-light
// (zustand only): src/app-api/core/resourceApi.ts writes to it from
// openModal()/closeModal(), and dialog UI must not be dragged into that
// chunk. ModalLauncherHost subscribes and renders one dialog per entry.

import { create } from 'zustand'

import type { ModalLauncherStoreModel } from '../../../models/StoreModel/ModalLauncherStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

export const useModalLauncherStore = create<ModalLauncherStoreModel>(
  (set, get) => ({
    openModals: [],

    openModal(appId: string, id: string) {
      if (get().openModals.some((m) => m.appId === appId && m.id === id)) {
        return
      }
      set((state) => ({ openModals: [...state.openModals, { appId, id }] }))
    },

    closeModal(appId: string, id: string) {
      set((state) => ({
        openModals: state.openModals.filter(
          (m) => !(m.appId === appId && m.id === id),
        ),
      }))
    },

    closeAllByAppId(appId: string) {
      set((state) => ({
        openModals: state.openModals.filter((m) => m.appId !== appId),
      }))
    },
  }),
)

// Close any open modals when an app is disabled/unmounted or mount() fails —
// appLifecycle.ts / useAppManager call cleanupAllForApp(appId). This module
// is guaranteed loaded before any modal can open because resourceApi.ts
// imports it.
registerAppCleanup((appId) =>
  useModalLauncherStore.getState().closeAllByAppId(appId),
)
