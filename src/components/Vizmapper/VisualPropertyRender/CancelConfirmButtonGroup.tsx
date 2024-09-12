import { Box, Button, Backdrop } from '@mui/material'
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
        color="error"
        onClick={() => {
          closePopover('cancel')
        }}
      >
        Cancel
      </Button>
      <Button onClick={() => closePopover('confirm')}>Confirm</Button>
    </Box>
  )
}
