import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { ReactElement, useMemo } from 'react'

import { useLayoutStore } from '../../../data/hooks/stores/LayoutStore'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'

interface PreferredLayoutSelectorProps {
  selectedEngine: string
  selectedAlgorithm: string
  setSelected: (engineName: string, algorithmName: string) => void
}

/**
 * The Select value for an (engine, algorithm) pair. Encoded as JSON rather
 * than joined with a separator: engine and algorithm names are free text
 * ('Cytoscape.js', an app id, the qualified `<appId>::<id>` of an app
 * algorithm) and a joined string cannot be split back reliably.
 */
export const encodeLayoutSelection = (
  engine: string,
  algorithm: string,
): string => JSON.stringify([engine, algorithm])

export const decodeLayoutSelection = (
  value: string,
): [string, string] | undefined => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === 'string' &&
      typeof parsed[1] === 'string'
    ) {
      return [parsed[0], parsed[1]]
    }
  } catch {
    // fall through
  }
  return undefined
}

export const LayoutSelector = ({
  selectedEngine,
  selectedAlgorithm,
  setSelected,
}: PreferredLayoutSelectorProps): ReactElement => {
  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  // Derived synchronously, so an engine removed from the store (an app
  // disabled while the dialog is open) never leaves a stale option behind
  // for a render, which MUI reports as an out-of-range value.
  const layoutList = useMemo(() => {
    const layouts: Array<[string, string, string]> = []
    layoutEngines.forEach((engine: LayoutEngine) => {
      Object.values(engine.algorithms).forEach((algorithm: LayoutAlgorithm) => {
        layouts.push([engine.name, algorithm.name, algorithm.displayName])
      })
    })
    return layouts
  }, [layoutEngines])

  const handleChange = (event: SelectChangeEvent): void => {
    const decoded = decodeLayoutSelection(event.target.value)
    if (decoded !== undefined) {
      setSelected(decoded[0], decoded[1])
    }
  }

  return (
    <FormControl fullWidth variant="standard" sx={{ margin: 0, marginTop: 1 }}>
      <Select
        data-testid="layout-selector-select"
        // On the clickable display element: a dropDown parameter in the
        // same dialog is also a combobox, so specs cannot pick by role.
        SelectDisplayProps={
          {
            'data-testid': 'layout-selector-combobox',
          } as React.HTMLAttributes<HTMLDivElement>
        }
        labelId="default-layout"
        id="default-layout-select"
        value={encodeLayoutSelection(selectedEngine, selectedAlgorithm)}
        label="Layout"
        onChange={handleChange}
      >
        {layoutList.map(([engine, algorithm, displayName]) => {
          const val = encodeLayoutSelection(engine, algorithm)
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
