import * as React from 'react'
import debounce from 'lodash.debounce'
import { Box, Stack, Typography, Slider } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

const percentToOpacity = (val: number): number => +(val / 100).toFixed(2)
const opacityToPercent = (val: number): number => Math.floor(val * 100)

export function OpacitySlider(props: {
  currentValue: number | null
  onValueChange: (value: number) => void
  closePopover: () => void
}): React.ReactElement {
  const { onValueChange, currentValue } = props
  const debouncedOpacityValueChange = debounce(onValueChange, 150)
  const [localOpacityValue, setLocalOpacityValue] = React.useState<number>(
    currentValue ?? 0,
  )
  return (
    <Box sx={{ p: 1, width: 200, height: 80 }}>
      <Stack spacing={2} direction="row" sx={{ mt: 2 }} alignItems="center">
        <VisibilityOffIcon sx={{ color: '#D9D9D9' }} />
        <Slider
          valueLabelDisplay="on"
          value={opacityToPercent(localOpacityValue)}
          onChange={(e, newVal: number) => {
            setLocalOpacityValue(percentToOpacity(newVal))
            debouncedOpacityValueChange(percentToOpacity(newVal))
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
