// src/app-api/core/dialogApi.ts
//
// Per-app factory for the Dialog API. Each instance is bound to a specific
// appId at creation time — mirrors createResourceApi / createContextMenuApi.
// Available via AppContext.apis.dialog — NOT on window.CyWebApi.

import { v4 as uuidv4 } from 'uuid'

import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import type { ApiResult } from '../types/ApiResult'
import { AppCodes, fail, ok } from '../types/ApiResult'
import type { DialogApi, OpenDialogOptions } from '../types/AppDialogTypes'

const DIALOG_MAX_WIDTHS = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/**
 * Create a per-app DialogApi instance bound to the given appId.
 * Prevents an app from closing another app's dialogs.
 */
export const createDialogApi = (appId: string): DialogApi => ({
  open(options: OpenDialogOptions): ApiResult<{ dialogId: string }> {
    try {
      // typeof guards before any property access or string method: options
      // can arrive from untyped JS apps with any shape (or none), and a
      // thrown TypeError would come back as OPERATION_FAILED instead of the
      // accurate INVALID_INPUT.
      if (typeof options !== 'object' || options === null) {
        return fail(
          AppCodes.INVALID_INPUT,
          `options must be an object, got ${options === null ? 'null' : typeof options}`,
        )
      }
      if (typeof options.title !== 'string' || options.title.trim() === '') {
        return fail(
          AppCodes.INVALID_INPUT,
          'title is required and must be non-empty',
        )
      }
      if (typeof options.render !== 'function') {
        return fail(
          AppCodes.INVALID_INPUT,
          `render must be a function, got ${typeof options.render}`,
        )
      }
      if (
        options.id !== undefined &&
        (typeof options.id !== 'string' || options.id.trim() === '')
      ) {
        return fail(AppCodes.INVALID_INPUT, 'id must be a non-empty string')
      }
      if (
        options.maxWidth !== undefined &&
        options.maxWidth !== false &&
        !DIALOG_MAX_WIDTHS.includes(options.maxWidth)
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
      const id = options.id ?? uuidv4()
      useAppDialogStore.getState().openDialog({
        id,
        appId,
        title: options.title,
        render: options.render as unknown,
        maxWidth: options.maxWidth,
        fullWidth: options.fullWidth,
      })
      return ok({ dialogId: id })
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },

  close(dialogId?: string): ApiResult {
    try {
      if (dialogId !== undefined && typeof dialogId !== 'string') {
        return fail(
          AppCodes.INVALID_INPUT,
          `dialogId must be a string, got ${typeof dialogId}`,
        )
      }
      const store = useAppDialogStore.getState()
      // No id: the most recently opened dialog still open for this app —
      // read from the store rather than remembered here, so a dialog the
      // user already closed through the host's "X" is never the target.
      const id =
        dialogId ?? store.dialogs.filter((d) => d.appId === appId).at(-1)?.id
      if (id === undefined) {
        return fail(AppCodes.RESOURCE_NOT_FOUND, 'no dialog is open')
      }
      store.closeDialog(appId, id)
      return ok()
    } catch (e) {
      return fail(AppCodes.OPERATION_FAILED, String(e))
    }
  },
})
