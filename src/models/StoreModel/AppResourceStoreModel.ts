// src/models/StoreModel/AppResourceStoreModel.ts
//
// TypeScript interface for the AppResourceStore (Phase 2).
// Defines the state shape and actions for the runtime resource registry.

import type {
  RegisteredAppResource,
  ResourceSlot,
} from '../AppModel/RegisteredAppResource'

export interface AppResourceState {
  readonly resources: RegisteredAppResource[]
}

export interface AppResourceActions {
  /**
   * Insert or replace a resource. If a resource with the same
   * (appId, slot, id) triple exists, it is replaced in place.
   */
  upsertResource(resource: RegisteredAppResource): void

  /** Remove a specific resource by identity triple. */
  removeResource(appId: string, slot: ResourceSlot, id: string): void

  /** Check if a resource with the given identity exists. */
  hasResource(appId: string, slot: ResourceSlot, id: string): boolean

  /** Remove all resources registered by the given app. */
  removeAllByAppId(appId: string): void
}

export type AppResourceStoreModel = AppResourceState & AppResourceActions
