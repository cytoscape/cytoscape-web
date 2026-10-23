import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import * as React from 'react'

export type ScalingType = 'width' | 'height' | 'both'

interface ScalingTypeSelectorProps {
  scalingType: ScalingType
  setScalingType: (scalingType: ScalingType) => void
  disabled?: boolean
}

export const ScalingTypeSelector = ({
  scalingType,
  setScalingType,
  disabled = false,
}: ScalingTypeSelectorProps): JSX.Element => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setScalingType(event.target.value as ScalingType)
  }

  return (
    // A disabled FormControl disables its label and every radio in it
    <FormControl data-testid="scaling-type-selector" disabled={disabled}>
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
          control={<Radio data-testid="scaling-type-width-radio" />}
          label="Width"
        />
        <FormControlLabel
          key={'height'}
          value="height"
          control={<Radio data-testid="scaling-type-height-radio" />}
          label="Height"
        />
        <FormControlLabel
          key={'both'}
          value="both"
          control={<Radio data-testid="scaling-type-both-radio" />}
          label="Both"
        />
      </RadioGroup>
    </FormControl>
  )
}
