// src/app-api/core/resourceApi.ts
//
// Per-app factory for the App Resource registration API (Phase 2).
// Each instance is bound to a specific appId at creation time.
// Available via AppContext.apis.resource in mount() — NOT on window.CyWebApi.

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useModalLauncherStore } from '../../data/hooks/stores/ModalLauncherStore'
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
  RegisterModalOptions,
  RegisterNetworkSearchProviderOptions,
  RegisterPanelOptions,
  ResourceApi,
  ResourceVisibilityResult,
} from '../types/AppResourceTypes'

const SUPPORTED_SLOTS: ResourceSlot[] = [
  'right-panel',
  'apps-menu',
  'search-bar',
  'modal-launcher',
]

const MODAL_MAX_WIDTHS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

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
 * React element markers. An element instance (`<Foo />`) carries one of
 * these as its `$$typeof` — a common registration mistake ("pass the
 * component, not the rendered element") that must be rejected here, since
 * it would otherwise only explode much later, inside the host renderer.
 * 'react.transitional.element' is the React 19 name for 'react.element'.
 */
const REACT_ELEMENT_MARKERS = new Set<symbol>([
  Symbol.for('react.element'),
  Symbol.for('react.transitional.element'),
  Symbol.for('react.portal'),
])

/**
 * Check if a value is a valid React component type.
 * Accepts function components and class components (functions), and the
 * exotic object component types — React.lazy(), React.memo(),
 * React.forwardRef() — which are objects branded with a symbol `$$typeof`.
 * Rejects primitives, plain objects (`{}`), and React element instances.
 */
function isValidComponent(value: unknown): boolean {
  if (typeof value === 'function') return true
  if (typeof value !== 'object' || value === null) return false
  const marker = (value as { $$typeof?: unknown }).$$typeof
  return typeof marker === 'symbol' && !REACT_ELEMENT_MARKERS.has(marker)
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
    isHttpUrl(value) || value.startsWith('data:image/') || value.startsWith('/')
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
      // typeof guards before any string method: entries can arrive from
      // untyped JS apps with any shape, and a thrown TypeError would come
      // back as OPERATION_FAILED instead of the accurate INVALID_INPUT.
      if (typeof options.id !== 'string' || options.id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      // The pre-1.0 shape. Named explicitly so a migrating app gets the
      // reason instead of a bare "label is required".
      if ((options as { component?: unknown }).component !== undefined) {
        return fail(
          AppCodes.INVALID_INPUT,
          "'apps-menu' items no longer accept a component: register label/icon/onClick and open a dialog from onClick (apis.dialog.open) for custom UI",
        )
      }
      if (typeof options.label !== 'string' || options.label.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'label is required and must be non-empty',
        )
      }
      if (typeof options.onClick !== 'function') {
        return fail(
          AppCodes.INVALID_INPUT,
          `onClick must be a function, got ${typeof options.onClick}`,
        )
      }
      if (
        options.isEnabled !== undefined &&
        typeof options.isEnabled !== 'function'
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          `isEnabled must be a function, got ${typeof options.isEnabled}`,
        )
      }
      if (
        options.tooltip !== undefined &&
        typeof options.tooltip !== 'string'
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          `tooltip must be a string, got ${typeof options.tooltip}`,
        )
      }
      // Same contract as the 'search-bar' icon: a URI, never a component.
      if (
        options.icon !== undefined &&
        (typeof options.icon !== 'string' || !isValidIconUri(options.icon))
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          'icon must be an http(s) URL or a data:image URI',
        )
      }
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'apps-menu',
        title: options.label,
        tooltip: options.tooltip,
        icon: options.icon,
        order: options.order,
        group: options.group,
        requires: options.requires,
        onClick: options.onClick as (apis: unknown) => void | Promise<void>,
        isEnabled: options.isEnabled as
          | ((apis: unknown) => boolean)
          | undefined,
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
      // typeof guards before any string method: entries can arrive from
      // untyped JS apps with any shape, and a thrown TypeError would come
      // back as OPERATION_FAILED instead of the accurate INVALID_INPUT.
      if (typeof options.id !== 'string' || options.id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (typeof options.name !== 'string' || options.name.trim() === '') {
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
      if (
        options.icon !== undefined &&
        (typeof options.icon !== 'string' || !isValidIconUri(options.icon))
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          'icon must be an http(s) URL or a data:image URI',
        )
      }
      if (
        options.website !== undefined &&
        (typeof options.website !== 'string' || !isHttpUrl(options.website))
      ) {
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

  registerModal(options) {
    try {
      // typeof guards before any string method: entries can arrive from
      // untyped JS apps with any shape, and a thrown TypeError would come
      // back as OPERATION_FAILED instead of the accurate INVALID_INPUT.
      if (typeof options.id !== 'string' || options.id.trim() === '') {
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
      if (
        options.maxWidth !== undefined &&
        options.maxWidth !== false &&
        !MODAL_MAX_WIDTHS.includes(options.maxWidth)
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          "maxWidth must be one of 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false",
        )
      }
      if (
        options.fullWidth !== undefined &&
        typeof options.fullWidth !== 'boolean'
      ) {
        return fail(
          AppCodes.INVALID_INPUT,
          `fullWidth must be a boolean, got ${typeof options.fullWidth}`,
        )
      }
      const store = useAppResourceStore.getState()
      store.upsertResource({
        id: options.id,
        appId,
        slot: 'modal-launcher',
        maxWidth: options.maxWidth,
        fullWidth: options.fullWidth,
        component: options.component as unknown,
        errorFallback: options.errorFallback as unknown,
      })
      return ok({ resourceId: `${appId}::modal-launcher::${options.id}` })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterModal(modalId) {
    try {
      const store = useAppResourceStore.getState()
      if (!store.hasResource(appId, 'modal-launcher', modalId)) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, `Modal '${modalId}'`)
      }
      store.removeResource(appId, 'modal-launcher', modalId)
      // An unregistered modal must not stay on screen (or resurface if the
      // same id is re-registered later).
      useModalLauncherStore.getState().closeModal(appId, modalId)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  openModal(id) {
    try {
      if (typeof id !== 'string' || id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (
        !useAppResourceStore.getState().hasResource(appId, 'modal-launcher', id)
      ) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, `Modal '${id}'`)
      }
      useModalLauncherStore.getState().openModal(appId, id)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  closeModal(id) {
    try {
      if (typeof id !== 'string' || id.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'id is required and must be non-empty',
        )
      }
      if (
        !useAppResourceStore.getState().hasResource(appId, 'modal-launcher', id)
      ) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, `Modal '${id}'`)
      }
      useModalLauncherStore.getState().closeModal(appId, id)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  unregisterAll() {
    try {
      useAppResourceStore.getState().removeAllByAppId(appId)
      // Unregistered modals must not stay on screen.
      useModalLauncherStore.getState().closeAllByAppId(appId)
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
      } else if (entry.slot === 'modal-launcher') {
        result = this.registerModal(entry as RegisterModalOptions)
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
