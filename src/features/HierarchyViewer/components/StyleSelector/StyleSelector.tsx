import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useState } from 'react'
import { useVisualStyleSelectorStore } from '../../store/VisualStyleSelectorStore'

export const StyleSelector = (): JSX.Element => {
  const [selectedStyleName, setSelectedStyleName] = useState<string>('')
  const visualStyles = useVisualStyleSelectorStore(
    (state) => state.sharedVisualStyles,
  )

  const handleChange = (event: SelectChangeEvent): void => {
    setSelectedStyleName(event.target.value)
  }

  return (
    <FormControl sx={{ width: '100%', minWidth: 120 }} size="small">
      <Select
        labelId="demo-select-small-label"
        id="demo-select-small"
        value={selectedStyleName}
        label="Style"
        onChange={handleChange}
      >
        {Object.keys(visualStyles).map((id: string) => (
          <MenuItem key={id} value={id}>
            {id}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
