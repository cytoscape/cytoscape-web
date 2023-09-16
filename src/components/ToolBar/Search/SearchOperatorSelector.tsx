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
      <FormLabel id="operator-selector-label">Operator</FormLabel>
      <RadioGroup
        row
        aria-labelledby="operator-selector-label"
        name="operator-selector-group"
        value={value}
        onChange={handleChange}
      >
        <FormControlLabel value="AND" control={<Radio />} label="AND" />
        <FormControlLabel value="OR" control={<Radio />} label="OR" />
      </RadioGroup>
    </FormControl>
  )
}
