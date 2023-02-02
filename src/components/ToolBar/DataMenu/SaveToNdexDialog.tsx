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

interface SaveToNdexDialogProps {
  open: boolean
  handleClose: () => void
  handleLoad: (uuid: string) => void
}
export const SaveToNdexDialog = (
  props: SaveToNdexDialogProps,
): ReactElement => {
  const [uuid] = useState<string>(EXAMPLE_UUID)
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const { open, handleClose, handleLoad } = props
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Save Network to NDEx:</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <h5>Remote NDEx server is set to: {ndexBaseUrl}</h5>
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="Name"
          label="Name"
          type="text"
          fullWidth
          variant="standard"
        />
        <TextField
          autoFocus
          margin="dense"
          id="Author"
          label="Author"
          type="text"
          fullWidth
          variant="standard"
        />
        <TextField
          autoFocus
          margin="dense"
          id="Organism"
          label="Organism"
          type="text"
          fullWidth
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={() => handleLoad(uuid)}>Export Network to NDEx</Button>
      </DialogActions>
    </Dialog>
  )
}
