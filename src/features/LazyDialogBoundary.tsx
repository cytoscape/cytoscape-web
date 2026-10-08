import { ReactNode, useState } from 'react'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'

import { useMessageStore } from '../data/hooks/stores/MessageStore'
import { logUi } from '../debug'
import { MessageSeverity } from '../models/MessageModel'

interface LazyDialogBoundaryProps {
  /** The dialog's name, as the user knows it (e.g. "Export Network to Image"). */
  name: string
  /**
   * The dialog's open flag, for a host that keeps the dialog mounted. Each
   * closed-to-open edge tries the load again; closing does not, so a chunk
   * that is still missing is reported once per attempt to open it. Omit it
   * for a host that mounts the boundary only while the dialog is open.
   */
  open?: boolean
  children: ReactNode
}

/**
 * Guards a lazily loaded dialog (#785). Without it, a chunk that fails to
 * load reaches the app-level ErrorBoundary in `App.tsx`, which replaces the
 * whole workspace with the error page. That happens on a stale tab after a
 * redeploy (the old chunk hash is gone) or when the connection drops before
 * the first open. The boundary logs the failure, tells the user to reload,
 * and renders nothing, so the rest of the app keeps working.
 */
export const LazyDialogBoundary = ({
  name,
  open = true,
  children,
}: LazyDialogBoundaryProps): ReactNode => {
  // Count opens (adjusting state during render, like the dialogs' re-key
  // wrappers) so only a new open resets the boundary.
  const [wasOpen, setWasOpen] = useState(open)
  const [opens, setOpens] = useState(0)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setOpens(opens + 1)
    }
  }

  return (
    <ReactErrorBoundary
      fallback={null}
      resetKeys={[opens]}
      onError={(error) => {
        logUi.error(`[LazyDialogBoundary]: ${name} failed to load`, error)
        useMessageStore.getState().addMessage({
          message: `Could not open ${name}. Reload the page and try again.`,
          duration: 6000,
          severity: MessageSeverity.ERROR,
        })
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}
