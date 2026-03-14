// src/data/hooks/stores/AppResourceStore.ts
//
// Zustand store for app resources registered at runtime by external apps.
// No persistence — resources are re-registered on each app mount.

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import type { ResourceSlot } from '../../../models/AppModel/RegisteredAppResource'
import type { AppResourceStoreModel } from '../../../models/StoreModel/AppResourceStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

export const useAppResourceStore = create(
  immer<AppResourceStoreModel>((set, get) => ({
    resources: [],

    upsertResource(resource: RegisteredAppResource) {
      set((state) => {
        const idx = state.resources.findIndex(
          (r) =>
            r.appId === resource.appId &&
            r.slot === resource.slot &&
            r.id === resource.id,
        )
        if (idx >= 0) {
          // Replace in place — preserves array position for stable ordering
          state.resources[idx] = resource
        } else {
          state.resources.push(resource)
        }
        return state
      })
    },

    removeResource(appId: string, slot: ResourceSlot, id: string) {
      set((state) => {
        state.resources = state.resources.filter(
          (r) => !(r.appId === appId && r.slot === slot && r.id === id),
        )
        return state
      })
    },

    hasResource(appId: string, slot: ResourceSlot, id: string): boolean {
      return get().resources.some(
        (r) => r.appId === appId && r.slot === slot && r.id === id,
      )
    },

    removeAllByAppId(appId: string) {
      set((state) => {
        state.resources = state.resources.filter((r) => r.appId !== appId)
        return state
      })
    },
  })),
)

// Register cleanup so appLifecycle.ts can clean up app resources
// for a disabled/unmounted app via cleanupAllForApp(appId).
registerAppCleanup((appId) =>
  useAppResourceStore.getState().removeAllByAppId(appId),
)
