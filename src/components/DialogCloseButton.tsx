import CloseIcon from '@mui/icons-material/Close'
import { IconButton, Tooltip } from '@mui/material'
import { ReactElement } from 'react'

interface DialogCloseButtonProps {
  onClose: () => void
  'data-testid'?: string
}

/**
 * The Close "X" in a dialog's top-right corner. Render it as a direct child of
 * `CyDialog` (the dialog paper is the positioning context) and give the
 * `DialogTitle` `sx={{ pr: 6 }}` so a long title stays clear of it.
 *
 * Backdrop click and Esc are inert (DIALOG_DISMISS_POLICY.md), so when this is
 * a dialog's only exit the label matters: it is always exactly "Close".
 * `dialogPolicy.test.ts` recognises this component by name as an exit.
 */
export const DialogCloseButton = ({
  onClose,
  'data-testid': testId,
}: DialogCloseButtonProps): ReactElement => (
  <Tooltip title="Close">
    <IconButton
      data-testid={testId}
      aria-label="Close"
      onClick={onClose}
      sx={{ position: 'absolute', top: 8, right: 8 }}
    >
      <CloseIcon />
    </IconButton>
  </Tooltip>
)
