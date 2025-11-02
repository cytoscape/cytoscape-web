import { Box, Button, MenuItem, Select, Typography } from '@mui/material'
import React from 'react'
import { CustomGraphicsType } from '../../../models'
import { DEFAULT_CUSTOM_GRAPHICS } from '../../../models/VisualStyleModel/impl/DefaultVisualStyle'

export function CustomGraphicPicker(props: {
  currentValue: CustomGraphicsType | null
  onValueChange: (customGraphicValue: CustomGraphicsType) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props

  const [localValue, setLocalValue] = React.useState(
    currentValue ?? DEFAULT_CUSTOM_GRAPHICS,
  )

  React.useEffect(() => {
    setLocalValue(currentValue ?? DEFAULT_CUSTOM_GRAPHICS)
  }, [currentValue])

  // TODO implement this form
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Box>{JSON.stringify(localValue, null, 2)}</Box>
        <Button
          color="primary"
          onClick={() => {
            props.closePopover('cancel')
            setLocalValue(currentValue ?? DEFAULT_CUSTOM_GRAPHICS)
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
          onClick={() => {
            props.onValueChange(localValue)
            props.closePopover('confirm')
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}

// TODO display a rendered image/pie chart/ring chart
export function CustomGraphicRender(props: {
  value: CustomGraphicsType
}): React.ReactElement {
  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="body1" sx={{ fontSize: 8 }}>
        {JSON.stringify(props.value, null, 2)}
      </Typography>
    </Box>
  )
}
