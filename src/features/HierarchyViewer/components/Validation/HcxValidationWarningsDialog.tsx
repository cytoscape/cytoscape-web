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

export interface HcxValidationWarningsDialogProps {
  open: boolean
  onClose: () => void
  validationResult?: HcxValidationResult
}

export const HcxValidationWarningsDialog = (
  props: HcxValidationWarningsDialogProps,
): ReactElement => {
  const { open, onClose, validationResult } = props
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
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
