import * as React from 'react'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'

export const SearchOperatorSelector = (): JSX.Element => {
  const [value, setValue] = React.useState('OR')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setValue((event.target as HTMLInputElement).value)
  }

  return (
    <FormControl>
      <FormLabel id="demo-row-radio-buttons-group-label">Operator</FormLabel>
      <RadioGroup
        row
        aria-labelledby="demo-row-radio-buttons-group-label"
        name="row-radio-buttons-group"
        value={value}
        onChange={handleChange}
      >
        <FormControlLabel value="AND" control={<Radio />} label="AND" />
        <FormControlLabel value="OR" control={<Radio />} label="OR" />
      </RadioGroup>
    </FormControl>
  )
}
