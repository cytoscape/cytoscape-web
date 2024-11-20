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
        color="primary"
        onClick={() => {
          closePopover('cancel')
        }}
      >
        Cancel
      </Button>
      <Button
        sx={{
          color: '#FFFFFF',
          backgroundColor: '#337ab7',
          '&:hover': {
            backgroundColor: '#285a9b',
          },
        }}
        onClick={() => closePopover('confirm')}
      >
        Confirm
      </Button>
    </Box>
  )
}
