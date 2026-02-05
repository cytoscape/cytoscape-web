import * as React from 'react'
import { Box, Slider, TextField } from '@mui/material'

interface SliderWithInputProps {
  value: number
  min: number
  max: number
  step?: number
  label?: string
  tooltip?: string
  onChange: (value: number) => void
  onInputChange?: (value: number) => void
  inputWidth?: number
  inputProps?: object
}

/**
 * Reusable slider with text input pattern used in PropertiesForm
 */
export const SliderWithInput: React.FC<SliderWithInputProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  onInputChange,
  inputWidth = 80,
  inputProps = {},
}) => {
  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    const vNum = Array.isArray(newValue) ? newValue[0] : newValue
    onChange(vNum)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const handler = onInputChange || onChange
    let v = parseFloat(e.target.value)
    if (isNaN(v)) v = min
    v = Math.max(min, Math.min(max, v))
    handler(v)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        onChange={handleSliderChange}
        sx={{ flex: 1 }}
      />
      <TextField
        type="number"
        value={value}
        onChange={handleInputChange}
        inputProps={{ min, max, step, ...inputProps }}
        size="small"
        sx={{ width: inputWidth }}
      />
    </Box>
  )
}

