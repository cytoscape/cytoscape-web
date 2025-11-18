import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { ReactElement, useEffect, useState } from 'react'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'

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
  const [layoutList, setLayoutList] = useState<Array<[string, string, string]>>(
    [],
  )

  const handleChange = (event: SelectChangeEvent): void => {
    const [engine, algorithm] = event.target.value.split('-')
    setSelected(engine, algorithm)
  }

  useEffect(() => {
    const layouts: Array<[string, string, string]> = []
    layoutEngines.forEach((engine: LayoutEngine) => {
      const { algorithms } = engine
      const algorithmNames = Object.keys(algorithms)
      algorithmNames.forEach((algorithmName: string) => {
        const algorithm: LayoutAlgorithm = algorithms[algorithmName]
        layouts.push([engine.name, algorithm.name, algorithm.displayName])
      })
    })
    setLayoutList(layouts)
  }, [layoutEngines])

  return (
    <FormControl fullWidth variant="standard" sx={{ margin: 0, marginTop: 1 }}>
      <Select
        data-testid="layout-selector-select"
        labelId="default-layout"
        id="default-layout-select"
        value={getListItem(selectedEngine, selectedAlgorithm)}
        label="Layout"
        onChange={handleChange}
      >
        {layoutList.map(([engine, algorithm, displayName]) => {
          const val = getListItem(engine, algorithm)
          return (
            <MenuItem key={val} value={val}>
              {displayName}
            </MenuItem>
          )
        })}
      </Select>
    </FormControl>
  )
}
