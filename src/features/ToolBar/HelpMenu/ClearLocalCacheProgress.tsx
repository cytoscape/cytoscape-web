import { Backdrop, CircularProgress, Paper, Typography } from '@mui/material'

import { waitingForOtherTabsMessage } from '@/data/db/clearLocalCache'

interface ClearLocalCacheProgressProps {
  open: boolean
  /** Databases another tab is still holding open, or null. */
  waitingFor: readonly string[] | null
}

/**
 * Covers the editor while Help › Developer › Clear Local Cache runs.
 *
 * Not a dialog, because there is nothing to cancel: the databases are already
 * closed and writes suspended, so the workspace behind it can no longer save
 * anything. It goes away with the reload. While another tab blocks a delete it
 * says which database and what to do; the clear finishes by itself once that
 * tab lets go.
 */
export const ClearLocalCacheProgress = ({
  open,
  waitingFor,
}: ClearLocalCacheProgressProps) => {
  // MUI keeps a closed Backdrop mounted, hidden. Nothing at all is simpler
  // for screen readers and for tests, and it only ever opens once per page.
  if (!open) {
    return null
  }
  return (
    <Backdrop
      open
      data-testid="clear-local-cache-progress"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
    >
      <Paper
        role="status"
        aria-live="polite"
        sx={{
          p: 3,
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center',
        }}
      >
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
      </Paper>
    </Backdrop>
  )
}
