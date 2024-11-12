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
  onCancel?: () => void
  isAlert?: boolean
  confirmDisabled?: boolean
}
export const ConfirmationDialog = (
  props: ConfirmationDialogProps,
): JSX.Element => {
  const {
    open,
    setOpen,
    message,
    title,
    buttonTitle,
    onConfirm,
    onCancel,
    isAlert,
    confirmDisabled,
  } = props

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    setOpen(false)
    if (onCancel) {
      onCancel()
    }
  }
  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
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
        <Button onClick={handleCancel} color="primary">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={confirmDisabled ?? false}
          autoFocus
          sx={{
            color: isAlert ? '#F50157' : '#FFFFFF',
            backgroundColor: isAlert ? 'transparent' : '#337ab7',
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: isAlert ? '#fc266f' : '#285a9b',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
        >
          {buttonTitle === undefined || buttonTitle === '' ? 'OK' : buttonTitle}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
