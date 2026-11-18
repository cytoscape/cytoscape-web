import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { waitingForOtherTabsMessage } from '@/data/db/clearLocalCache'

interface ClearLocalCacheProgressProps {
  open: boolean
  /** Databases another tab is still holding open, or null. */
  waitingFor: readonly string[] | null
  /** Why the last attempt failed, or null while it runs. */
  failure: string | null
  onRetry: () => void
  onReload: () => void
}

/** The app's mount point, made inert while the overlay is up. */
const APP_ROOT_ID = 'root'

/**
 * Covers the editor while Help › Developer › Clear Local Cache runs, and
 * after it fails.
 *
 * The workspace behind it can no longer save anything (the databases are
 * closed and writes suspended), so it must be unreachable: the overlay takes
 * the pointer, and the app root is made `inert` so neither the keyboard nor
 * assistive technology can reach it. The overlay renders in a portal outside
 * that root, so it stays reachable itself. Not MUI's Backdrop, whose root is
 * `aria-hidden` and would hide the instructions from screen readers.
 *
 * While another tab blocks a delete it says which database and what to do;
 * the clear finishes by itself once that tab lets go. A failure shows its
 * reason with Try Again, and Reload for a reader who would rather start over
 * with what is left.
 */
export const ClearLocalCacheProgress = ({
  open,
  waitingFor,
  failure,
  onRetry,
  onReload,
}: ClearLocalCacheProgressProps) => {
  const retryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const root = document.getElementById(APP_ROOT_ID)
    root?.setAttribute('inert', '')
    return () => {
      root?.removeAttribute('inert')
    }
  }, [open])

  useEffect(() => {
    if (failure !== null) {
      retryRef.current?.focus()
    }
  }, [failure])

  if (!open) {
    return null
  }

  return createPortal(
    <Box
      data-testid="clear-local-cache-progress"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Paper
        role={failure === null ? 'status' : 'alert'}
        aria-live={failure === null ? 'polite' : 'assertive'}
        sx={{
          p: 3,
          mx: 2,
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center',
        }}
      >
        {failure === null ? (
          <>
            <CircularProgress size={28} />
            <Typography variant="body1">Clearing local cache...</Typography>
            {waitingFor !== null && waitingFor.length > 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="clear-local-cache-waiting"
              >
                {waitingForOtherTabsMessage(waitingFor)}
              </Typography>
            )}
          </>
        ) : (
          <>
            <Typography variant="body1">
              The local cache was not cleared.
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              data-testid="clear-local-cache-failure"
            >
              {failure}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button data-testid="clear-local-cache-reload" onClick={onReload}>
                Reload
              </Button>
              <Button
                ref={retryRef}
                variant="contained"
                color="error"
                data-testid="clear-local-cache-retry"
                onClick={onRetry}
              >
                Try Again
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>,
    document.body,
  )
}
