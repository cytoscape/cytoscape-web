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
          {`This network is marked as an hierarchical network (HCX), and doesn't fully meet the HCX specification, hierarchical viewer functionality may be affected.`}
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
