import { FormControl, FormControlLabel, FormLabel, Switch } from '@mui/material'

export const SearchModeSelector = (): JSX.Element => {
  return (
    <FormControl>
      <FormLabel id="operator-selector-label">Search Mode</FormLabel>
      <FormControlLabel
        value="start"
        control={<Switch color="primary" />}
        label="Fuzzy Search"
        labelPlacement="start"
      />
    </FormControl>
  )
}
