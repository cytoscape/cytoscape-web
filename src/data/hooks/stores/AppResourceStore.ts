// src/data/hooks/stores/AppResourceStore.ts
//
// Zustand store for app resources registered at runtime by external apps.
// No persistence — resources are re-registered on each app mount.
//
// NOTE: This store deliberately does NOT use Immer middleware.
// Resources contain React.lazy() components whose internal _status property
// must remain mutable for React to resolve them. Immer would freeze these
// objects and cause "Cannot assign to read only property '_status'" errors.

import { create } from 'zustand'

import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import type { ResourceSlot } from '../../../models/AppModel/RegisteredAppResource'
import type { AppResourceStoreModel } from '../../../models/StoreModel/AppResourceStoreModel'
import { registerAppCleanup } from './AppCleanupRegistry'

export const useAppResourceStore = create<AppResourceStoreModel>((set, get) => ({
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
        const updated = [...state.resources]
        updated[idx] = resource
        return { resources: updated }
      }
      return { resources: [...state.resources, resource] }
    })
  },

  removeResource(appId: string, slot: ResourceSlot, id: string) {
    set((state) => ({
      resources: state.resources.filter(
        (r) => !(r.appId === appId && r.slot === slot && r.id === id),
      ),
    }))
  },

  hasResource(appId: string, slot: ResourceSlot, id: string): boolean {
    return get().resources.some(
      (r) => r.appId === appId && r.slot === slot && r.id === id,
    )
  },

  removeAllByAppId(appId: string) {
    set((state) => ({
      resources: state.resources.filter((r) => r.appId !== appId),
    }))
  },
}))

// Register cleanup so appLifecycle.ts can clean up app resources
// for a disabled/unmounted app via cleanupAllForApp(appId).
registerAppCleanup((appId) =>
  useAppResourceStore.getState().removeAllByAppId(appId),
)
