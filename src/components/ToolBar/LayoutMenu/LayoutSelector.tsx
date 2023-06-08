import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { LayoutEngine } from '../../../models/LayoutModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { ReactElement, useEffect, useState } from 'react'

interface PreferredLayoutSelectorProps {
  selectedEngine: string
  selectedAlgorithm: string
  setSelected: (engineName: string, algorithmName: string) => void
}

const getListItem = (engine: string, algorithm: string): string =>
  `${engine}-${algorithm}`

export const LayoutSelector = ({
  selectedEngine,
  selectedAlgorithm,
  setSelected,
}: PreferredLayoutSelectorProps): ReactElement => {
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  // List of engine-algorithm name pairs
  const [layoutList, setLayoutList] = useState<Array<[string, string]>>([])

  const handleChange = (event: SelectChangeEvent): void => {
    const [engine, algorithm] = event.target.value.split('-')
    setSelected(engine, algorithm)
  }

  useEffect(() => {
    const layouts: Array<[string, string]> = []
    layoutEngines.forEach((engine: LayoutEngine) => {
      Object.keys(engine.algorithms).forEach((algorithmName: string) => {
        layouts.push([engine.name, algorithmName])
      })
    })
    setLayoutList(layouts)
  }, [layoutEngines])

  return (
    <FormControl fullWidth variant="standard" sx={{ margin: 0, marginTop: 1 }}>
      <Select
        labelId="default-layout"
        id="default-layout-select"
        value={getListItem(selectedEngine, selectedAlgorithm)}
        label="Layout"
        onChange={handleChange}
      >
        {layoutList.map(([engine, algorithm]) => {
          const val = getListItem(engine, algorithm)
          return (
            <MenuItem key={val} value={val}>
              {`${engine}: ${algorithm}`}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}
