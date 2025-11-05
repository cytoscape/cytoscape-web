import { Button, FormHelperText, Stack } from '@mui/material'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useEffect, useState } from 'react'

import { useUiStateStore } from '../../../../hooks/stores/UiStateStore'
import { useVisualStyleSelectorStore } from '../../store/VisualStyleSelectorStore'

export const StyleSelector = (): JSX.Element => {
  const [selectedStyleName, setSelectedStyleName] = useState<string>('')

  const ui = useUiStateStore((state) => state.ui)
  const { activeNetworkView } = ui

  const visualStyles = useVisualStyleSelectorStore(
    (state) => state.sharedVisualStyles,
  )

  const handleChange = (event: SelectChangeEvent): void => {
    setSelectedStyleName(event.target.value)
  }

  useEffect(() => {
    if (Object.keys(visualStyles).length > 0) {
      setSelectedStyleName(Object.keys(visualStyles)[0])
    }
  }, [visualStyles])

  const applyVisualStyle = (): void => {}

  return (
    <Stack direction="row" spacing={2}>
      <FormControl sx={{ width: '100%', minWidth: 120 }} size="small">
        <Select
          labelId="demo-select-small-label"
          id="demo-select-small"
          value={selectedStyleName}
          onChange={handleChange}
        >
          {Object.keys(visualStyles).map((id: string) => (
            <MenuItem key={id} value={id}>
              {id}
            </MenuItem>
          ))}
          <MenuItem value="preset1" key={'preset1'}>
            Preset 1
          </MenuItem>
        </Select>
        <FormHelperText>Shared Visual Style</FormHelperText>
      </FormControl>
      <Button
        variant="contained"
        size="small"
        sx={{ mt: 1 }}
        onClick={applyVisualStyle}
      >
        Apply
      </Button>
    </Stack>
  )
}
