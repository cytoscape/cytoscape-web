// src/models/StoreModel/AppDialogStoreModel.ts
//
// TypeScript interface for the AppDialogStore: dialogs opened at runtime
// through the per-app Dialog API (apis.dialog.open()). Unlike the
// 'modal-launcher' slot there is no separate registration — the dialog
// definition and its open-state are one entry.

import type { RegisteredAppDialog } from '../AppModel/RegisteredAppDialog'

export interface AppDialogState {
  /** Open dialogs in opening order — insertion order is stacking order. */
  readonly dialogs: RegisteredAppDialog[]
}

export interface AppDialogActions {
  /**
   * Insert or replace a dialog. If a dialog with the same (appId, id) is
   * already open it is replaced in place (matches AppResourceStore's upsert
   * semantics), so reopening with the same id never stacks a duplicate.
   */
  openDialog(dialog: RegisteredAppDialog): void

  /** Remove the dialog if present (idempotent). */
  closeDialog(appId: string, id: string): void

  /** Close all dialogs opened by the given app. */
  closeAllByAppId(appId: string): void
}

export type AppDialogStoreModel = AppDialogState & AppDialogActions
