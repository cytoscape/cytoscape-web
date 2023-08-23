import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useUiStateStore } from '../../store/UiStateStore'
import { Ui } from '../../models/UiModel'

interface WarningDialogProps {
  open: boolean
  handleClose: () => void
}

export const WarningDialog = ({
  open,
  handleClose,
}: WarningDialogProps): JSX.Element => {
  const ui: Ui = useUiStateStore((state) => state.ui)
  const { errorMessage } = ui
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{'Error:'}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {errorMessage}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
