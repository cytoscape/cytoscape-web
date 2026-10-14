// src/models/StoreModel/ModalLauncherStoreModel.ts
//
// TypeScript interface for the ModalLauncherStore: the open-state of
// 'modal-launcher' resources. The registrations themselves live in
// AppResourceStore; this store only tracks which of them are open.

/**
 * An open app modal, identified by the (appId, id) pair of its
 * 'modal-launcher' resource registration.
 */
export interface OpenAppModal {
  readonly appId: string
  readonly id: string
}

export interface ModalLauncherState {
  /** Open modals in opening order — insertion order is stacking order. */
  readonly openModals: OpenAppModal[]
}

export interface ModalLauncherActions {
  /** Append the modal if not already open (idempotent). */
  openModal(appId: string, id: string): void

  /** Remove the modal if present (idempotent). */
  closeModal(appId: string, id: string): void

  /** Close all modals opened by the given app. */
  closeAllByAppId(appId: string): void
}

export type ModalLauncherStoreModel = ModalLauncherState & ModalLauncherActions
