import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import { ReactElement, useState } from 'react'

import {
  dismissMultiTabNotice,
  isMultiTabNoticeDismissed,
} from './multiTabAwareness'
import { useMultiTabDetection } from './useMultiTabDetection'

/**
 * One-time, dismissable banner explaining that Cytoscape Web tabs share a single
 * workspace (CW-658). Shown the first time a second tab is detected in this
 * browser; "Don't show again" persists the dismissal across sessions.
 *
 * Mounted at the app root (see App.tsx) so it is route-independent.
 */
export const MultiTabNotice = (): ReactElement | null => {
  const multipleTabsOpen = useMultiTabDetection()
  const [dismissed, setDismissed] = useState<boolean>(() =>
    isMultiTabNoticeDismissed(),
  )

  const handleDismiss = (): void => {
    setDismissed(true)
  }

  const handleDontShowAgain = (): void => {
    dismissMultiTabNotice()
    setDismissed(true)
  }

  if (!multipleTabsOpen || dismissed) {
    return null
  }

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      data-testid="multi-tab-notice"
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={handleDismiss}
        action={
          <Button color="inherit" size="small" onClick={handleDontShowAgain}>
            Don&apos;t show again
          </Button>
        }
      >
        Cytoscape Web works like a desktop app: all tabs in this browser share one
        workspace. Changes made in another tab can reload or replace what you see
        here.
      </Alert>
    </Snackbar>
  )
}
