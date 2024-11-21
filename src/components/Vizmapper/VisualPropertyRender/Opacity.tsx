import * as React from 'react'
import debounce from 'lodash.debounce'
import { Box, Stack, Typography, Slider, Button } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

const percentToOpacity = (val: number): number => +(val / 100).toFixed(2)
const opacityToPercent = (val: number): number => Math.floor(val * 100)

export function OpacitySlider(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: (reason: string) => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const [localOpacityValue, setLocalOpacityValue] = React.useState<number>(
    currentValue ?? 0,
  )

  React.useEffect(() => {
    setLocalOpacityValue(currentValue ?? 0)
  }, [currentValue])
  return (
    <Box sx={{ p: 1, mt: 3, width: 200, height: 120 }}>
      <Stack
        sx={{ p: 1, mb: 1 }}
        spacing={2}
        direction="row"
        alignItems="center"
      >
        <VisibilityOffIcon sx={{ color: '#D9D9D9' }} />
        <Slider
          valueLabelDisplay="on"
          value={opacityToPercent(localOpacityValue)}
          onChange={(e, newVal: number) => {
            setLocalOpacityValue(percentToOpacity(newVal))
            // debouncedOpacityValueChange(percentToOpacity(newVal))
          }}
          marks={[
            {
              value: 0,
              label: '0%',
            },
            {
              value: 100,
              label: '100%',
            },
          ]}
        />
        <VisibilityIcon />
      </Stack>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
        <Button
          color="primary"
          onClick={() => {
            props.closePopover('cancel')
            setLocalOpacityValue(currentValue ?? 0)
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
            props.onValueChange(localOpacityValue)
            props.closePopover('confirm')
          }}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}

export function Opacity(props: { value: number }): React.ReactElement {
  return (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontSize: 12 }} variant="body1">
        {opacityToPercent(props.value)}%
      </Typography>
    </Box>
  )
}
