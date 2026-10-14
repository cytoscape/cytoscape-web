// src/app-api/core/contextMenuApi.ts
//
// Context Menu API — factory pattern (Phase 2).
//
// Two access paths:
//   1. Per-app factory: createContextMenuApi(appId) — used by host for AppContext.apis.contextMenu
//      Items carry the bound appId; cleaned up automatically via removeAllByAppId.
//   2. Anonymous singleton: contextMenuApi — used only for window.CyWebApi.contextMenu
//      Items have appId === undefined; never auto-cleaned.
//
// Plugin apps (React) must use AppContext.apis.contextMenu exclusively.
// Using window.CyWebApi.contextMenu from inside a plugin app bypasses the
// lifecycle model and risks leaving stale items.

import { v4 as uuidv4 } from 'uuid'

import { useContextMenuItemStore } from '../../data/hooks/stores/ContextMenuItemStore'
import type {
  ContextMenuItemConfig,
  ContextMenuTarget,
} from '../../models/StoreModel/ContextMenuItemStoreModel'
import type { ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export type {
  ContextMenuHandlerContext,
  ContextMenuItemConfig,
  ContextMenuTarget,
} from '../../models/StoreModel/ContextMenuItemStoreModel'

export interface ContextMenuApi {
  /**
   * Register a new context menu item.
   *
   * @param config - Label, target types, and handler for the item
   * @returns `ok({ itemId })` on success; `fail(InvalidInput)` if label is empty
   */
  addContextMenuItem(
    config: ContextMenuItemConfig,
  ): ApiResult<{ itemId: string }>

  /**
   * Remove a previously registered context menu item.
   *
   * @param itemId - The ID returned by `addContextMenuItem`
   * @returns `ok()` on success; `fail(ContextMenuItemNotFound)` if ID is unknown
   */
  removeContextMenuItem(itemId: string): ApiResult
}

// ── Default target types ──────────────────────────────────────────────────────

const DEFAULT_TARGET_TYPES: ContextMenuTarget[] = ['node', 'edge']

// ── Shared validation and registration logic ─────────────────────────────────

function validateAndRegister(
  config: ContextMenuItemConfig,
  appId?: string,
): ApiResult<{ itemId: string }> {
  try {
    if (!config.label || config.label.trim() === '') {
      return fail(
        AppCodes.INVALID_INPUT,
        'label is required and must be non-empty',
      )
    }

    const itemId = uuidv4()
    const targetTypes = config.targetTypes ?? DEFAULT_TARGET_TYPES

    useContextMenuItemStore.getState().addItem({
      ...config,
      label: config.label.trim(),
      targetTypes,
      itemId,
      appId, // undefined for anonymous registrations
    })

    return ok({ itemId })
  } catch (e) {
    return fail(AppCodes.OPERATION_FAILED, String(e))
  }
}

/**
 * Remove a registered item. When `ownerAppId` is provided (per-app
 * factory), the item is removed only if it belongs to that app — one app
 * must not be able to remove another app's (or an anonymous) item by
 * guessing its id. The anonymous singleton passes `undefined` and may
 * remove only anonymous items for the same reason.
 */
function removeItem(itemId: string, ownerAppId?: string): ApiResult {
  try {
    const items = useContextMenuItemStore.getState().items
    const item = items.find((i) => i.itemId === itemId)
    if (item === undefined) {
      return fail(AppCodes.CONTEXT_MENU_ITEM_NOT_FOUND, itemId)
    }
    if (item.appId !== ownerAppId) {
      // Owned by a different app (or anonymous vs app-owned) — report as
      // not found rather than leaking that the id exists elsewhere.
      return fail(AppCodes.CONTEXT_MENU_ITEM_NOT_FOUND, itemId)
    }
    useContextMenuItemStore.getState().removeItem(itemId)
    return ok()
  } catch (e) {
    return fail(AppCodes.OPERATION_FAILED, String(e))
  }
}

// ── Per-app factory (lifecycle-managed, used by host for AppContext) ──────────

/**
 * Create a per-app ContextMenuApi instance bound to the given appId.
 * Items registered via this factory carry the appId and are automatically
 * cleaned up when the app is disabled via removeAllByAppId.
 */
export const createContextMenuApi = (appId: string): ContextMenuApi => ({
  addContextMenuItem: (config) => validateAndRegister(config, appId),
  removeContextMenuItem: (itemId) => removeItem(itemId, appId),
})

// ── Anonymous singleton — no appId bound, for window.CyWebApi only ───────────
// Plugin apps (React) must NOT use this path; use AppContext.apis.contextMenu.

export const contextMenuApi: ContextMenuApi = {
  addContextMenuItem: (config) => validateAndRegister(config, undefined),
  removeContextMenuItem: removeItem,
}
