import { CompactSelection, GridSelection } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { CellEdit } from '../../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { Table, ValueType } from '../../../models/TableModel'

export interface ContextMenuActionArgs {
  contextMenuCell: readonly [number, number]
  rows: any[] | undefined
  allColumns: any[] | undefined
  currentTable: Table | undefined
  nodeTable: Table | undefined
  currentNetworkId: IdType
  postEdit: (
    type: UndoCommandType,
    description: string,
    undoArgs: any[],
    redoArgs: any[],
  ) => void
  applyValueToElements: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnKey: string,
    value: any,
    elementIds: string[] | undefined,
  ) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
  handleContextMenuClose: () => void
}

export const handleApplyToEntireColumn = ({
  contextMenuCell,
  rows,
  allColumns,
  currentTable,
  nodeTable,
  currentNetworkId,
  postEdit,
  applyValueToElements,
  setNetworkModified,
  handleContextMenuClose,
}: ContextMenuActionArgs): void => {
  if (currentTable == null) return

  const [columnIndex, rowIndex] = contextMenuCell
  const rowData = rows?.[rowIndex]
  const column = allColumns?.[columnIndex]
  if (rowData == null || column == null) return

  const columnKey = column.id
  const cellValue = (rowData as any)?.[columnKey]
  
  const cellEdits: CellEdit[] = []
  const prevColumnValues: CellEdit[] = []
  
  Array.from(currentTable.rows.entries()).forEach(([k, v]) => {
    cellEdits.push({
      row: k,
      column: columnKey,
      value: cellValue,
    })
    prevColumnValues.push({
      row: k,
      column: columnKey,
      value: (v as any)?.[columnKey] as ValueType,
    })
  })

  const elementType = currentTable === nodeTable ? 'node' : 'edge'

  postEdit(
    UndoCommandType.APPLY_VALUE_TO_COLUMN,
    'Apply value to column',
    [currentNetworkId, elementType, prevColumnValues],
    [currentNetworkId, elementType, cellEdits],
  )
  
  applyValueToElements(
    currentNetworkId,
    elementType,
    columnKey,
    cellValue,
    undefined,
  )
  
  setNetworkModified(currentNetworkId, true)
  handleContextMenuClose()
}

export const handleApplyToSelected = ({
  contextMenuCell,
  rows,
  allColumns,
  currentTable,
  nodeTable,
  currentNetworkId,
  postEdit,
  applyValueToElements,
  setNetworkModified,
  handleContextMenuClose,
}: ContextMenuActionArgs): void => {
  if (rows == null) return

  const [columnIndex, rowIndex] = contextMenuCell
  const rowData = rows?.[rowIndex]
  const column = allColumns?.[columnIndex]
  if (rowData == null || column == null) return

  const columnKey = column.id
  const cellValue = (rowData as any)?.[columnKey]
  
  const cellEdits: CellEdit[] = []
  const prevColumnValues: CellEdit[] = []
  
  rows.forEach((r) => {
    const rowId = r.id
    cellEdits.push({
      row: rowId,
      column: columnKey,
      value: cellValue,
    })
    prevColumnValues.push({
      row: rowId,
      column: columnKey,
      value: (r as any)?.[columnKey] as ValueType,
    })
  })

  const elementType = currentTable === nodeTable ? 'node' : 'edge'

  postEdit(
    UndoCommandType.APPLY_VALUE_TO_SELECTED,
    'Apply value to selected elements',
    [currentNetworkId, elementType, prevColumnValues],
    [currentNetworkId, elementType, cellEdits],
  )
  
  applyValueToElements(
    currentNetworkId,
    elementType,
    columnKey,
    cellValue,
    rows.map((r) => r.id),
  )
  
  setNetworkModified(currentNetworkId, true)
  handleContextMenuClose()
}

export interface HandleSelectFromSelectionArgs {
  selection: GridSelection
  rows: any[] | undefined
  currentTable: Table | undefined
  nodeTable: Table | undefined
  currentNetworkId: IdType
  exclusiveSelect: (
    networkId: IdType,
    nodeIds: string[],
    edgeIds: string[],
  ) => void
  setSelection: (selection: GridSelection) => void
  handleContextMenuClose: () => void
}

export const handleSelectFromSelection = ({
  selection,
  rows,
  currentTable,
  nodeTable,
  currentNetworkId,
  exclusiveSelect,
  setSelection,
  handleContextMenuClose,
}: HandleSelectFromSelectionArgs): void => {
  // Use the underlying Set of rows from CompactSelection
  // The actual property is usually _items or similar, but the TableBrowser uses .toArray()
  const rowsToSelect = new Set(selection.rows.toArray())

  if (selection.current) {
    const ranges =
      selection.current.rangeStack.length > 0
        ? selection.current.rangeStack
        : [selection.current.range]

    ranges.forEach((range) => {
      for (let r = range.y; r < range.y + range.height; r++) {
        rowsToSelect.add(r)
      }
    })
  }

  const rowIds = Array.from(rowsToSelect)
    .map((r) => rows?.[r]?.id)
    .filter((id) => id !== undefined)
    
  if (currentTable === nodeTable) {
    exclusiveSelect(currentNetworkId, rowIds as string[], [])
  } else {
    exclusiveSelect(currentNetworkId, [], rowIds as string[])
  }
  
  setSelection({
    ...selection,
    rows: CompactSelection.empty(),
  })
  
  handleContextMenuClose()
}
