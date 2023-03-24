import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material'

interface LayoutOptionDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
}
export const LayoutOptionDialog = ({
  open,
  setOpen,
}: LayoutOptionDialogProps): JSX.Element => {
  const [name, setName] = useState<string>('test')
  const [isEnabled, setIsEnabled] = useState(false)
  const [number, setNumber] = useState<number>(10)

  const handleClose = (): void => {
    setOpen(false)
  }

  const handleNameChange = (event: any): void => {
    setName(event.target.value)
  }

  const handleEnabledChange = (): void => {
    setIsEnabled(!isEnabled)
  }

  const handleNumberChange = (event: any): void => {
    setNumber(event.target.value)
  }

  const handleUpdate = (): void => {
    // Perform update logic here
    setOpen(false)
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Edit Layout Options</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Modify the values and click Update to save changes.
        </DialogContentText>
        <TextField
          label="Name"
          value={name}
          onChange={handleNameChange}
          fullWidth
          margin="normal"
        />
        <FormControlLabel
          control={
            <Switch
              checked={isEnabled}
              onChange={handleEnabledChange}
              color="primary"
            />
          }
          label="Enabled"
        />
        <TextField
          label="Number"
          value={number}
          onChange={handleNumberChange}
          type="number"
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleUpdate} color="primary">
          Update
        </Button>
      </DialogActions>
    </Dialog>
  )
}
