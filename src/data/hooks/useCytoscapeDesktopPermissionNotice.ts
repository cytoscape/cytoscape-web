import { useRef, useState } from 'react'

const STORAGE_KEY = 'cytoscapeWebDesktopPermissionNoticeSeen'

/**
 * Whether the one-time "local network permission" explanation has already been
 * shown (CW-Localhost). Persisted in localStorage so it appears only once.
 */
export const hasSeenDesktopPermissionNotice = (): boolean => {
  if (typeof window === 'undefined') {
    return true
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // If localStorage is unavailable, don't nag on every click.
    return true
  }
}

export const markDesktopPermissionNoticeSeen = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // Ignore quota / access errors.
  }
}

export interface DesktopPermissionNotice {
  /** True while the explanatory dialog should be shown. */
  open: boolean
  /**
   * Run a Cytoscape Desktop action. The first time (notice not yet seen) it
   * shows the explanatory dialog and defers the action until confirmed;
   * afterwards it runs the action immediately.
   */
  run: (action: () => void) => void
  /** Confirm the dialog: remember it, close, and run the deferred action. */
  onConfirm: () => void
  /** Dismiss the dialog without running the action. */
  onCancel: () => void
}

/**
 * Manages the one-time dialog explaining the browser's local-network permission
 * prompt that appears when Cytoscape Web talks to Cytoscape Desktop on
 * localhost:1234 (CW-Localhost).
 */
export const useCytoscapeDesktopPermissionNotice =
  (): DesktopPermissionNotice => {
    const [open, setOpen] = useState(false)
    const pendingActionRef = useRef<(() => void) | null>(null)

    const run = (action: () => void): void => {
      if (hasSeenDesktopPermissionNotice()) {
        action()
        return
      }
      pendingActionRef.current = action
      setOpen(true)
    }

    const onConfirm = (): void => {
      markDesktopPermissionNoticeSeen()
      setOpen(false)
      const action = pendingActionRef.current
      pendingActionRef.current = null
      action?.()
    }

    const onCancel = (): void => {
      setOpen(false)
      pendingActionRef.current = null
    }

    return { open, run, onConfirm, onCancel }
  }
