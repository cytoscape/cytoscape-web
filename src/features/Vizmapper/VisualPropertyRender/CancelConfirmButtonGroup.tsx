import { Backdrop,Box, Button } from '@mui/material'

import { VisualPropertyValueType } from '../../../models/VisualStyleModel'

export interface CancelConfirmButtonGroupProps {
  closePopover: (reason: string) => void
}

export const CancelConfirmButtonGroup = (
  props: CancelConfirmButtonGroupProps,
): React.ReactElement => {
  const { closePopover } = props
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
      <Button
        data-testid="visual-property-cancel-button"
        variant="outlined"
        onClick={() => {
          closePopover('cancel')
        }}
      >
        Cancel
      </Button>
      <Button
        data-testid="visual-property-confirm-button"
        variant="contained"
        onClick={() => closePopover('confirm')}
      >
        Confirm
      </Button>
    </Box>
  )
}
