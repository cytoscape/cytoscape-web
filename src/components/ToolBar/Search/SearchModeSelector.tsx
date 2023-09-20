import { FormControl, FormControlLabel, FormLabel, Switch } from '@mui/material'
import { useFilterStore } from '../../../store/FilterStore'

export const SearchModeSelector = (): JSX.Element => {
  const setOptions = useFilterStore((state) => state.setOptions)
  const searchOptions = useFilterStore((state) => state.search.options)
  const { exact } = searchOptions

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.checked
    setOptions({ ...searchOptions, exact: newValue })
  }

  return (
    <FormControl>
      <FormLabel id="operator-selector-label">Search Mode</FormLabel>
      <FormControlLabel
        control={
          <Switch color="primary" checked={exact} onChange={handleChange} />
        }
        label="Exact match"
        labelPlacement="start"
        onChange={handleChange}
      />
    </FormControl>
  )
}
