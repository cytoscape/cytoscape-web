import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { ReactElement, useEffect, useState } from 'react'

interface PreferredLayoutSelectorProps {
  title: string
  setLayout: (engineName: string, algorithmName: string) => void
}

const getListItem = (engine: string, algorithm: string): string =>
  `${engine}-${algorithm}`

export const LayoutSelector = ({
  title,
  setLayout,
}: PreferredLayoutSelectorProps): ReactElement => {
  const preferredLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  // List of engine-algorithm name pairs
  const [layoutList, setLayoutList] = useState<Array<[string, string]>>([])

  const handleChange = (event: SelectChangeEvent): void => {
    const [engine, algorithm] = event.target.value.split('-')
    setLayout(engine, algorithm)
  }

  useEffect(() => {
    const layouts: Array<[string, string]> = []
    layoutEngines.forEach((engine: LayoutEngine) => {
      engine.algorithmNames.forEach((algorithmName: string) => {
        layouts.push([engine.name, algorithmName])
      })
    })
    setLayoutList(layouts)
  }, [layoutEngines])

  return (
    <FormControl fullWidth variant="standard" sx={{ margin: 0, marginTop: 1 }}>
      <InputLabel id="preferred-layout" variant="standard">
        {title}
      </InputLabel>
      <Select
        labelId="preferred-layout"
        id="preferred-layout-select"
        value={getListItem(preferredLayout.engineName, preferredLayout.name)}
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
