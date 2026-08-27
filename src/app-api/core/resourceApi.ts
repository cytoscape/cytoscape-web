// src/app-api/core/resourceApi.ts
//
// Per-app factory for the App Resource registration API (Phase 2).
// Each instance is bound to a specific appId at creation time.
// Available via AppContext.apis.resource in mount() — NOT on window.CyWebApi.

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { logApp } from '../../debug'
import { AppStatus } from '../../models/AppModel/AppStatus'
import type { RegisteredAppResource } from '../../models/AppModel/RegisteredAppResource'
import type { ResourceSlot } from '../../models/AppModel/RegisteredAppResource'
import type { ApiError, ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'
import type {
  RegisteredResourceInfo,
  RegisterMenuItemOptions,
  RegisterNetworkSearchProviderOptions,
  RegisterPanelOptions,
  ResourceApi,
  ResourceVisibilityResult,
} from '../types/AppResourceTypes'

const SUPPORTED_SLOTS: ResourceSlot[] = [
  'right-panel',
  'apps-menu',
  'search-bar',
]

/** True when the current network's view has at least one selected element. */
function hasSelection(): boolean {
  const { currentNetworkId } = useWorkspaceStore.getState().workspace
  if (!currentNetworkId) return false
  const viewModel = useViewModelStore.getState().getViewModel(currentNetworkId)
  if (viewModel === undefined) return false
  return (
    viewModel.selectedNodes.length > 0 || viewModel.selectedEdges.length > 0
  )
}

/**
 * Check if a value is a valid React component type.
 * Accepts function components, class components, React.lazy(), React.memo(),
 * and React.forwardRef() — all of which are either functions or non-null objects.
 * Rejects primitives (string, number, boolean, null, undefined).
 */
function isValidComponent(value: unknown): boolean {
  return (
    typeof value === 'function' || (typeof value === 'object' && value !== null)
  )
}

/**
 * True when the value is an http(s) URL. Rejects everything else —
 * notably `javascript:` URIs, which must never reach `window.open` or an
 * `<img src>`.
 */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * True when the value is an http(s) URL, an inline data:image URI, or a
 * root-relative path (a bundled asset served by the host — how built-in
 * providers reference their logos).
 */
function isValidIconUri(value: string): boolean {
  return (
    isHttpUrl(value) ||
    value.startsWith('data:image/') ||
    value.startsWith('/')
  )
}

/**
 * Create a per-app ResourceApi instance bound to the given appId.
 * Prevents apps from registering resources under another app's identity.
 */
export const createResourceApi = (appId: string): ResourceApi => ({
  getSupportedSlots() {
    return ok({ slots: [...SUPPORTED_SLOTS] })
  },

  // ── Individual Registration (upsert semantics) ──────────────────

  registerPanel(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (!isValidComponent(options.component)) {
        return fail(
          AppCodes.INVALID_INPUT,
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
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterPanel(panelId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'right-panel', panelId)) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, `Panel '${panelId}'`)
      }
      store.removeResource(appId, 'right-panel', panelId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  registerMenuItem(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (!isValidComponent(options.component)) {
        return fail(
          AppCodes.INVALID_INPUT,
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
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterMenuItem(menuItemId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'apps-menu', menuItemId)) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, `Menu item '${menuItemId}'`)
      }
      store.removeResource(appId, 'apps-menu', menuItemId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  registerNetworkSearchProvider(options) {
    try {
      if (!options.id || options.id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (!options.name || options.name.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'name is required and must be non-empty',
        )
      }
      if (typeof options.onSubmit !== 'function') {
        return fail(
          AppCodes.INVALID_INPUT,
          `onSubmit must be a function, got ${typeof options.onSubmit}`,
        )
      }
      if (
        options.optionsComponent !== undefined &&
        !isValidComponent(options.optionsComponent)
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          `optionsComponent must be a React component (function or object like React.lazy), got ${typeof options.optionsComponent}`,
        )
      }
      if (options.icon !== undefined && !isValidIconUri(options.icon)) {
        return fail(
          AppCodes.INVALID_INPUT,
          'icon must be an http(s) URL or a data:image URI',
        )
      }
      if (options.website !== undefined && !isHttpUrl(options.website)) {
        return fail(AppCodes.INVALID_INPUT, 'website must be an http(s) URL')
      }
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'search-bar',
        title: options.name,
        description: options.description,
        icon: options.icon,
        website: options.website,
        placeholder: options.placeholder,
        component: options.optionsComponent as unknown,
        onSubmit: options.onSubmit as unknown,
        errorFallback: options.errorFallback as unknown,
      })
      return ok({ resourceId: `${appId}::search-bar::${options.id}` })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterNetworkSearchProvider(providerId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'search-bar', providerId)) {
        return fail(
          AppCodes.RESOURCE_NOT_FOUND,
          `Network search provider '${providerId}'`,
        )
      }
      store.removeResource(appId, 'search-bar', providerId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterAll() {
    try {
      useAppResourceStore.getState().removeAllByAppId(appId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
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
      } else if (entry.slot === 'search-bar') {
        result = this.registerNetworkSearchProvider(
          entry as RegisterNetworkSearchProviderOptions,
        )
      } else {
        // Statically unreachable (the union is exhaustive), but entries can
        // arrive from untyped JS apps with any slot string at runtime.
        const unknownEntry = entry as { id: string; slot: ResourceSlot }
        errors.push({
          id: unknownEntry.id,
          slot: unknownEntry.slot,
          error: {
            code: AppCodes.INVALID_INPUT.code,
            severity: AppCodes.INVALID_INPUT.severity,
            message: `Unsupported slot: ${unknownEntry.slot}`,
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

  getRegisteredResources(): ApiResult<{
    resources: RegisteredResourceInfo[]
  }> {
    try {
      const resources = useAppResourceStore
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
      return ok({ resources })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  getResourceVisibility(id): ApiResult<ResourceVisibilityResult> {
    try {
      const store = useAppResourceStore.getState()
      const resource = store.resources.find(
        (r: RegisteredAppResource) => r.appId === appId && r.id === id,
      )
      if (!resource) return ok({ registered: false, visible: false })

      // 1. Check app-active state
      const appStatus = useAppStore.getState().apps[appId]?.status
      if (appStatus !== AppStatus.Active) {
        return ok({
          registered: true,
          visible: false,
          hiddenReason: 'app-inactive',
        })
      }

      // 2. Evaluate visibility rules
      const { workspace } = useWorkspaceStore.getState()
      if (resource.requires?.network && !workspace.currentNetworkId) {
        return ok({
          registered: true,
          visible: false,
          hiddenReason: 'requires-network',
        })
      }
      if (resource.requires?.selection && !hasSelection()) {
        return ok({
          registered: true,
          visible: false,
          hiddenReason: 'requires-selection',
        })
      }

      return ok({ registered: true, visible: true })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
})
