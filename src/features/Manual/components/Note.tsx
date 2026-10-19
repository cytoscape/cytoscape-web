import { Alert } from '@mui/material'
import type { ReactElement, ReactNode } from 'react'

interface NoteProps {
  /** `warning` for actions that change or lose data. */
  severity?: 'info' | 'warning'
  children: ReactNode
}

/** A callout in manual text. */
export const Note = ({
  severity = 'info',
  children,
}: NoteProps): ReactElement => (
  <Alert
    severity={severity}
    variant="outlined"
    sx={{ my: 2, '& p': { my: 0.5 } }}
    data-testid="manual-note"
  >
    {children}
  </Alert>
)
