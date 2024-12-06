import * as React from 'react'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'

export type ScalingType = 'width' | 'height' | 'both'

interface ScalingTypeSelectorProps {
  scalingType: ScalingType
  setScalingType: (scalingType: ScalingType) => void
}

export const ScalingTypeSelector = ({
  scalingType,
  setScalingType,
}: ScalingTypeSelectorProps): JSX.Element => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setScalingType(event.target.value as ScalingType)
  }

  return (
    <FormControl>
      <FormLabel id="demo-row-radio-buttons-group-label">Scale</FormLabel>
      <RadioGroup
        row
        aria-labelledby="demo-row-radio-buttons-group-label"
        name="row-radio-buttons-group"
        value={scalingType}
        onChange={handleChange}
      >
        <FormControlLabel
          key={'width'}
          value="width"
          control={<Radio />}
          label="Width"
        />
        <FormControlLabel
          key={'height'}
          value="height"
          control={<Radio />}
          label="Height"
        />
        <FormControlLabel
          key={'both'}
          value="both"
          control={<Radio />}
          label="Both"
        />
      </RadioGroup>
    </FormControl>
  )
}
