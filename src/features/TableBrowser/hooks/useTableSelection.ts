import React from 'react'
import { CompactSelection, GridSelection } from '@glideapps/glide-data-grid'

export interface UseTableSelectionProps {
  currentTabIndex: number
}

export interface UseTableSelectionResult {
  selection: GridSelection
  nodeSelection: GridSelection
  edgeSelection: GridSelection
  setSelection: (newSelection: GridSelection) => void
  onGridSelectionChange: (newSelection: GridSelection) => void
}

export const useTableSelection = ({ currentTabIndex }: UseTableSelectionProps): UseTableSelectionResult => {
  const [nodeSelection, setNodeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })
  
  const [edgeSelection, setEdgeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })

  const selection = currentTabIndex === 0 ? nodeSelection : edgeSelection
  const updateSelection = currentTabIndex === 0 ? setNodeSelection : setEdgeSelection

  const onGridSelectionChange = React.useCallback(
    (newSelection: GridSelection) => {
      updateSelection(newSelection)
    },
    [updateSelection],
  )

  return {
    selection,
    nodeSelection,
    edgeSelection,
    setSelection: updateSelection,
    onGridSelectionChange,
  }
}
