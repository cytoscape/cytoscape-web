// src/features/ToolBar/DataMenu/store/loadFromNdexDialogStore.ts
//
// Open/close state for the "NDEx - Network Browser" dialog, lifted out of
// the Data menu so other entry points can open it too — the network search
// bar's NDEx provider opens it with a query to run immediately. Kept
// import-light (zustand only): the boot layer registers that provider, and
// its onSubmit must be able to reach this store without dragging dialog UI
// into the boot chunk.

import { create } from 'zustand'

interface LoadFromNdexDialogStore {
  isOpen: boolean
  /**
   * Query to prefill into the dialog's search field and run as soon as it
   * opens. null → plain browse mode (the Data-menu entry point).
   */
  initialQuery: string | null
  openDialog: (initialQuery?: string) => void
  closeDialog: () => void
}

export const useLoadFromNdexDialogStore = create<LoadFromNdexDialogStore>(
  (set) => ({
    isOpen: false,
    initialQuery: null,
    openDialog: (initialQuery?: string) => {
      set({ isOpen: true, initialQuery: initialQuery ?? null })
    },
    closeDialog: () => {
      set({ isOpen: false, initialQuery: null })
    },
  }),
)
