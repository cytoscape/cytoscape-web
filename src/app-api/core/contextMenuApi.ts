// src/app-api/core/contextMenuApi.ts
// Framework-agnostic Context Menu API core — zero React imports.
// All store access via .getState(); no React hook subscriptions.

import { v4 as uuidv4 } from 'uuid'

import { useContextMenuItemStore } from '../../data/hooks/stores/ContextMenuItemStore'
import type {
  ContextMenuItemConfig,
  ContextMenuTarget,
} from '../../models/StoreModel/ContextMenuItemStoreModel'
import { ApiErrorCode, ApiResult, fail, ok } from '../types/ApiResult'

// ── Public types ─────────────────────────────────────────────────────────────

export type { ContextMenuHandlerContext, ContextMenuItemConfig, ContextMenuTarget } from '../../models/StoreModel/ContextMenuItemStoreModel'

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

// ── Implementation ────────────────────────────────────────────────────────────

export const contextMenuApi: ContextMenuApi = {
  addContextMenuItem(config) {
    try {
      if (!config.label || config.label.trim() === '') {
        return fail(
          ApiErrorCode.InvalidInput,
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
      })

      return ok({ itemId })
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },

  removeContextMenuItem(itemId) {
    try {
      const items = useContextMenuItemStore.getState().items
      const exists = items.some((item) => item.itemId === itemId)

      if (!exists) {
        return fail(
          ApiErrorCode.ContextMenuItemNotFound,
          `Context menu item ${itemId} not found`,
        )
      }

      useContextMenuItemStore.getState().removeItem(itemId)
      return ok()
    } catch (e) {
      return fail(ApiErrorCode.OperationFailed, String(e))
    }
  },
}
