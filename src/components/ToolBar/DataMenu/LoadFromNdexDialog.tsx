import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { ReactElement, useState, useContext } from 'react'
import { AppConfigContext } from '../../../AppConfigContext'

// An example in dev.ndexbio.org
const EXAMPLE_UUID = '2c669bc1-f7eb-11ec-8bfe-0242c246b7fb'

interface LoadFromNdexDialogProps {
  open: boolean
  handleClose: () => void
  handleLoad: (uuid: string) => void
}
export const LoadFromNdexDialog = (
  props: LoadFromNdexDialogProps,
): ReactElement => {
  const [uuid, setUuid] = useState<string>(EXAMPLE_UUID)
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const { open, handleClose, handleLoad } = props
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Load Networks from NDEx: {ndexBaseUrl}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter UUID(s), separated by spaces
        </DialogContentText>
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
