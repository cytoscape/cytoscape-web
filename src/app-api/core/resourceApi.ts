// src/app-api/core/resourceApi.ts
//
// Per-app factory for the App Resource registration API (Phase 2).
// Each instance is bound to a specific appId at creation time.
// Available via AppContext.apis.resource in mount() — NOT on window.CyWebApi.

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logApp } from '../../debug'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { RegisteredAppResource } from '../../models/AppModel/RegisteredAppResource'
import type { ResourceSlot } from '../../models/AppModel/RegisteredAppResource'
import type { ApiError, ApiResult } from '../types/ApiResult'
import { ApiErrorCode, fail, ok } from '../types/ApiResult'
import type {
  RegisteredResourceInfo,
  RegisterMenuItemOptions,
  RegisterPanelOptions,
  ResourceApi,
  ResourceVisibilityResult,
} from '../types/AppResourceTypes'

const SUPPORTED_SLOTS: ResourceSlot[] = ['right-panel', 'apps-menu']

/**
 * Check if a value is a valid React component type.
 * Accepts function components, class components, React.lazy(), React.memo(),
 * and React.forwardRef() — all of which are either functions or non-null objects.
 * Rejects primitives (string, number, boolean, null, undefined).
 */
function isValidComponent(value: unknown): boolean {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null)
  )
}

/**
 * Create a per-app ResourceApi instance bound to the given appId.
 * Prevents apps from registering resources under another app's identity.
 */
export const createResourceApi = (appId: string): ResourceApi => ({
  getSupportedSlots() {
    return [...SUPPORTED_SLOTS]
  },

  // ── Individual Registration (upsert semantics) ──────────────────

  registerPanel(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'id is required and must be non-empty',
        )
      }
      if (!isValidComponent(options.component)) {
        return fail(
          ApiErrorCode.InvalidInput,
          `component must be a React component (function or object like React.lazy), got ${typeof options.component}`,
        )
      }
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'right-panel',
        title: options.title,
        order: options.order,
        group: options.group,
        requires: options.requires,
        component: options.component as unknown,
        errorFallback: options.errorFallback as unknown,
      })
      return ok({ resourceId: `${appId}::right-panel::${options.id}` })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  unregisterPanel(panelId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'right-panel', panelId)) {
        return fail(
          ApiErrorCode.ResourceNotFound,
          `Panel '${panelId}' not found`,
        )
      }
      store.removeResource(appId, 'right-panel', panelId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  registerMenuItem(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
          'id is required and must be non-empty',
        )
      }
      if (!isValidComponent(options.component)) {
        return fail(
          ApiErrorCode.InvalidInput,
          `component must be a React component (function or object like React.lazy), got ${typeof options.component}`,
        )
      }
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'apps-menu',
        title: options.title,
        order: options.order,
        group: options.group,
        requires: options.requires,
        component: options.component as unknown,
        errorFallback: options.errorFallback as unknown,
        closeOnAction: options.closeOnAction,
      })
      return ok({ resourceId: `${appId}::apps-menu::${options.id}` })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  unregisterMenuItem(menuItemId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'apps-menu', menuItemId)) {
        return fail(
          ApiErrorCode.ResourceNotFound,
          `Menu item '${menuItemId}' not found`,
        )
      }
      store.removeResource(appId, 'apps-menu', menuItemId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  unregisterAll() {
    try {
      useAppResourceStore.getState().removeAllByAppId(appId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  // ── Batch Registration ──────────────────────────────────────────

  registerAll(entries) {
    const registered: Array<{ resourceId: string }> = []
    const errors: Array<{
      id: string
      slot: ResourceSlot
      error: ApiError
    }> = []

    for (const entry of entries) {
      let result: ApiResult<{ resourceId: string }>
      if (entry.slot === 'right-panel') {
        result = this.registerPanel(entry as RegisterPanelOptions)
      } else if (entry.slot === 'apps-menu') {
        result = this.registerMenuItem(entry as RegisterMenuItemOptions)
      } else {
        errors.push({
          id: entry.id,
          slot: entry.slot,
          error: {
            code: ApiErrorCode.InvalidInput,
            message: `Unsupported slot: ${entry.slot}`,
          },
        })
        continue
      }
      if (result.success) {
        registered.push(result.data)
      } else {
        errors.push({ id: entry.id, slot: entry.slot, error: result.error })
      }
    }

    if (errors.length > 0) {
      for (const e of errors) {
        logApp.warn(
          `[ResourceApi]: registerAll skipped ${e.id} (${e.slot}): ${e.error.message}`,
        )
      }
    }

    return ok({ registered, errors })
  },

  // ── Introspection ───────────────────────────────────────────────

  getRegisteredResources(): RegisteredResourceInfo[] {
    return useAppResourceStore
      .getState()
      .resources.filter((r) => r.appId === appId)
      .map(
        (r): RegisteredResourceInfo => ({
          resourceId: `${r.appId}::${r.slot}::${r.id}`,
          slot: r.slot as ResourceSlot,
          id: r.id,
          title: r.title,
          order: r.order,
          requires: r.requires,
        }),
      )
  },

  getResourceVisibility(id): ResourceVisibilityResult {
    const store = useAppResourceStore.getState()
    const resource = store.resources.find(
      (r: RegisteredAppResource) => r.appId === appId && r.id === id,
    )
    if (!resource) return { registered: false, visible: false }

    // 1. Check app-active state
    const appStatus = useAppStore.getState().apps[appId]?.status
    if (appStatus !== AppStatus.Active) {
      return {
        registered: true,
        visible: false,
        hiddenReason: 'app-inactive',
      }
    }

    // 2. Evaluate visibility rules
    const { workspace } = useWorkspaceStore.getState()
    if (resource.requires?.network && !workspace.currentNetworkId) {
      return {
        registered: true,
        visible: false,
        hiddenReason: 'requires-network',
      }
    }
    if (resource.requires?.selection) {
      return {
        registered: true,
        visible: false,
        hiddenReason: 'requires-selection',
      }
    }

    return { registered: true, visible: true }
  },
})
