import { create } from 'zustand'

/**
 * Visibility of the floating Layout Tools panel (CW-540). Kept in its own
 * transient store so the Layout menu (which toggles it) and the network canvas
 * (which renders it) can share state without touching persisted UI state.
 */
interface LayoutToolsPanelStore {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useLayoutToolsPanelStore = create<LayoutToolsPanelStore>(
  (set) => ({
    open: false,
    setOpen: (open: boolean) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
  }),
)
