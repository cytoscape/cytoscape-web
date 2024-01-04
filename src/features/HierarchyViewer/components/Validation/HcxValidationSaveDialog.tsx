import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Typography,
  DialogActions,
  Button,
} from '@mui/material'
import { ReactElement } from 'react'
import { HcxValidationResult } from '../../model/HcxValidator'

export interface HcxValidationSaveDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  validationResult?: HcxValidationResult
}

export const HcxValidationSaveDialog = (
  props: HcxValidationSaveDialogProps,
): ReactElement => {
  const { open, onClose, onSubmit, validationResult } = props
  return (
    <Dialog open={open}>
      <DialogTitle>Invalid HCX Network</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`This network is marked as an hierarchical network (HCX), but it does not fully meet the HCX specification. Some Hierarchical viewer features may not work.`}
        </DialogContentText>
        <DialogContentText>
          {`Review HCX specification version '${
            validationResult?.version ?? ''
          }' for more details.`}
        </DialogContentText>
        <DialogContentText>
          <ul>
            {validationResult?.warnings.map((w, i) => (
              <li key={i}>
                <Typography color="warning" key={i}>
                  {w}
                </Typography>
              </li>
            ))}
          </ul>
        </DialogContentText>
        <DialogContentText>
          {`Are you sure you want to save this network to NDEx?`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit()}>Save To NDEx</Button>
      </DialogActions>
    </Dialog>
  )
}
