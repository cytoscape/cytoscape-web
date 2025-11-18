import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { Operator, SearchOptions } from '../../../models/FilterModel/Search'

export const SearchOperatorSelector = (): JSX.Element => {
  const options: SearchOptions = useFilterStore((state) => state.search.options)
  const setOption: (option: SearchOptions) => void = useFilterStore(
    (state) => state.setOptions,
  )
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const operator: Operator = (event.target as HTMLInputElement)
      .value as Operator
    setOption({ ...options, operator })
  }

  return (
    <FormControl>
      <FormLabel id="operator-selector-label">Operator</FormLabel>
      <RadioGroup
        row
        aria-labelledby="operator-selector-label"
        name="operator-selector-group"
        value={options.operator}
        onChange={handleChange}
      >
        <FormControlLabel
          value="AND"
          control={<Radio data-testid="search-operator-and-radio" />}
          label="AND"
        />
        <FormControlLabel
          value="OR"
          control={<Radio data-testid="search-operator-or-radio" />}
          label="OR"
        />
      </RadioGroup>
    </FormControl>
  )
}
