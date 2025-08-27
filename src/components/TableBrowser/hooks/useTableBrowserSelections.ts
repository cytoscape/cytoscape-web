import * as React from 'react'
import { GridSelection, CompactSelection } from '@glideapps/glide-data-grid'

interface SelectionStates {
  nodeSelection: GridSelection
  edgeSelection: GridSelection
  selectedCellColumn: number | null
}

interface SelectionActions {
  setNodeSelection: (selection: GridSelection) => void
  setEdgeSelection: (selection: GridSelection) => void
  setSelectedCellColumn: (column: number | null) => void
  clearAllSelections: () => void
  clearNodeSelection: () => void
  clearEdgeSelection: () => void
}

export function useTableBrowserSelections(): SelectionStates &
  SelectionActions {
  const [nodeSelection, setNodeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })

  const [edgeSelection, setEdgeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })

  const [selectedCellColumn, setSelectedCellColumn] = React.useState<
    number | null
  >(null)

  // Utility functions
  const clearAllSelections = React.useCallback(() => {
    setNodeSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty(),
    })
    setEdgeSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty(),
    })
    setSelectedCellColumn(null)
  }, [])

  const clearNodeSelection = React.useCallback(() => {
    setNodeSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty(),
    })
  }, [])

  const clearEdgeSelection = React.useCallback(() => {
    setEdgeSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty(),
    })
  }, [])

  return {
    // States
    nodeSelection,
    edgeSelection,
    selectedCellColumn,

    // Actions
    setNodeSelection,
    setEdgeSelection,
    setSelectedCellColumn,
    clearAllSelections,
    clearNodeSelection,
    clearEdgeSelection,
  }
}
