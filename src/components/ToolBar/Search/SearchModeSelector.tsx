import {
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
} from '@mui/material'
import { useFilterStore } from '../../../store/FilterStore'

export const SearchModeSelector = (): JSX.Element => {
  const setOptions = useFilterStore((state) => state.setOptions)
  const searchOptions = useFilterStore((state) => state.search.options)
  const { exact } = searchOptions

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.value === 'exact'
    setOptions({ ...searchOptions, exact: newValue })
  }

  return (
    <FormControl>
      <FormLabel id="operator-selector-label">Search Mode</FormLabel>
      <RadioGroup
        row
        aria-labelledby="operator-selector-label"
        name="search-mode"
        value={exact ? 'exact' : 'contains'}
        onChange={handleChange}
      >
        <FormControlLabel
          value="exact"
          control={<Radio color="primary" />}
          label="Equals"
        />
        <FormControlLabel
          value="contains"
          control={<Radio color="primary" />}
          label="Contains"
        />
      </RadioGroup>
    </FormControl>
  )
}
