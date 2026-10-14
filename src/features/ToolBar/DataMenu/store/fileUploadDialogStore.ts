// src/features/ToolBar/DataMenu/store/fileUploadDialogStore.ts
//
// Open/close state for the "Network from File..." upload dialog, lifted out
// of the Data menu so other entry points can open it too — the empty
// workspace panel offers "Import from file" from the canvas (#651). Mirrors
// loadFromNdexDialogStore: zustand only, no dialog UI imported here.

import { create } from 'zustand'

interface FileUploadDialogStore {
  isOpen: boolean
  /**
   * Latches true on the first open and never resets. The Data menu mounts the
   * lazy FileUpload dialog only after this flips, so the import pipeline stays
   * out of the eager toolbar chunk while the close animation still plays and
   * reopening is instant.
   */
  hasOpened: boolean
  openDialog: () => void
  closeDialog: () => void
}

export const useFileUploadDialogStore = create<FileUploadDialogStore>(
  (set) => ({
    isOpen: false,
    hasOpened: false,
    openDialog: () => {
      set({ isOpen: true, hasOpened: true })
    },
    closeDialog: () => {
      set({ isOpen: false })
    },
  }),
)
