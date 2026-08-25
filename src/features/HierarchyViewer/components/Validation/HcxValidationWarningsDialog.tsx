import {
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'
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

  // A network can be valid HCX and still carry warnings, e.g. a hierarchy whose
  // edges are not all parent-child relationships (issue #630).
  const isValid: boolean = validationResult?.isValid ?? false

  return (
    <CyDialog
      dismiss="lightweight"
      open={open}
      onClose={onClose}
      data-testid="hcx-validation-warnings-dialog"
    >
      <DialogTitle>
        {isValid ? 'HCX Network Warnings' : 'Invalid HCX Network'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isValid
            ? `This network meets the HCX specification, but some Hierarchical viewer features are not available for it.`
            : `This network is marked as an hierarchical network (HCX), but it does not fully meet the HCX specification. Some Hierarchical viewer features may not work.`}
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
        <Button
          data-testid="hcx-validation-warnings-dialog-close"
          variant="contained"
          onClick={() => onClose()}
        >
          Close
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
