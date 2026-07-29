// src/app-api/core/dialogApi.ts
//
// Per-app factory for the Dialog API. Each instance is bound to a specific
// appId at creation time — mirrors createResourceApi/createContextMenuApi.
// Available via AppContext.apis.dialog — NOT on window.CyWebApi.

import { v4 as uuidv4 } from 'uuid'

import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import type { ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'
import type { DialogApi, OpenDialogOptions } from '../types/AppDialogTypes'

/**
 * Create a per-app DialogApi instance bound to the given appId.
 * Prevents an app from closing another app's dialogs.
 */
export const createDialogApi = (appId: string): DialogApi => {
  // Tracks the most recently opened dialog id for this app so close() with
  // no argument — the common case — doesn't require the caller to have
  // held onto the id returned by open().
  let lastOpenedId: string | undefined

  return {
    open(options: OpenDialogOptions): ApiResult<{ dialogId: string }> {
      try {
        if (!options.title || options.title.trim() === '') {
          return fail(
            AppCodes.INVALID_INPUT,
            'title is required and must be non-empty',
          )
        }
        if (typeof options.render !== 'function') {
          return fail(AppCodes.INVALID_INPUT, 'render must be a function')
        }
        const id = options.id ?? uuidv4()
        useAppDialogStore.getState().openDialog({
          id,
          appId,
          title: options.title,
          render: options.render,
          maxWidth: options.maxWidth,
          disableClose: options.disableClose,
        })
        lastOpenedId = id
        return ok({ dialogId: id })
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },

    close(dialogId?: string): ApiResult {
      try {
        const id = dialogId ?? lastOpenedId
        if (id === undefined) {
          return fail(AppCodes.RESOURCE_NOT_FOUND, 'no dialog is open')
        }
        useAppDialogStore.getState().closeDialog(appId, id)
        return ok()
      } catch (e) {
        return fail(AppCodes.OPERATION_FAILED, String(e))
      }
    },
  }
}
