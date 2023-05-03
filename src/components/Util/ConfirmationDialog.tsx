import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ConfirmationDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  message: string
  buttonTitle?: string
  onConfirm: () => void
}
export const ConfirmationDialog = (
  props: ConfirmationDialogProps,
): JSX.Element => {
  const { open, setOpen, message, title, buttonTitle, onConfirm } = props

  const handleCancel = (): void => {
    setOpen(false)
  }
  const handleConfirm = (): void => {
    setOpen(false)
    onConfirm()
  }

  return (
    <Dialog
      open={open}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleConfirm} autoFocus>
          {buttonTitle === undefined || buttonTitle === '' ? 'OK' : buttonTitle}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
