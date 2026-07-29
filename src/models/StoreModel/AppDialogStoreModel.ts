// src/models/StoreModel/AppDialogStoreModel.ts
//
// TypeScript interface for the AppDialogStore.
// Defines the state shape and actions for host-rendered app dialogs.

import type { RegisteredAppDialog } from '../AppModel/RegisteredAppDialog'

export interface AppDialogState {
  readonly dialogs: RegisteredAppDialog[]
}

export interface AppDialogActions {
  /**
   * Insert or replace a dialog. If a dialog with the same (appId, id) exists,
   * it is replaced in place (matches AppResourceStore's upsert semantics).
   */
  openDialog(dialog: RegisteredAppDialog): void

  /** Remove a specific dialog by identity pair. */
  closeDialog(appId: string, id: string): void

  /** Remove all dialogs opened by the given app. */
  closeAllForApp(appId: string): void
}

export type AppDialogStoreModel = AppDialogState & AppDialogActions
