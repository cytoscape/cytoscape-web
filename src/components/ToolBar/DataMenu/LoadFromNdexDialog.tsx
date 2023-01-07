import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { ReactElement, useState } from 'react'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
  handleLoad: (uuid: string) => void
}
export const LoadFromNdexDialog = (
  props: LoadFromNdexDialogProps,
): ReactElement => {
  const [uuid, setUuid] = useState<string>('')

  const { open, handleClose, handleLoad } = props
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Load from NDEx:</DialogTitle>
      <DialogContent>
        <DialogContentText>Enter an UUID for the netowrk</DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="uuid"
          label="UUID"
          type="text"
          fullWidth
          variant="standard"
          onChange={(e) => setUuid(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={() => handleLoad(uuid)}>Load</Button>
      </DialogActions>
    </Dialog>
  )
}
