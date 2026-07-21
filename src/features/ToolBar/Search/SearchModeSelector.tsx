import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'

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
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}
      >
        <FormControlLabel
          value="exact"
          control={
            <Radio data-testid="search-mode-exact-radio" color="primary" />
          }
          label={<Typography component="span" sx={{ whiteSpace: 'nowrap' }}>Exact Match</Typography>}
        />
        <FormControlLabel
          value="contains"
          control={
            <Radio data-testid="search-mode-contains-radio" color="primary" />
          }
          label={<Typography component="span" sx={{ whiteSpace: 'nowrap' }}>Contains</Typography>}
        />
      </RadioGroup>
    </FormControl>
  )
}
