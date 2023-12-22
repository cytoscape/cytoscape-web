import { Typography } from '@mui/material'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface WarningDialogProps {
  title?: string
  subtitle?: string
  message: string
  open: boolean
  handleClose: () => void
}

export const WarningDialog = ({
  title,
  subtitle,
  message,
  open,
  handleClose,
}: WarningDialogProps): JSX.Element => {
  const dialogTitle = title === undefined ? 'Info:' : title
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{dialogTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {subtitle === undefined ? null : (
            <Typography variant="subtitle2">{subtitle}</Typography>
          )}
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
