import { Item } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { CellEdit } from '../../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { Table, ValueType } from '../../../models/TableModel'
import {
  deserializeValue,
  serializedStringIsValid,
} from '../../../models/TableModel/impl/valueTypeImpl'

export interface HandlePasteArgs {
  target: Item
  values: readonly (readonly string[])[]
  rows: any[] | undefined
  allColumns: any[] | undefined
  currentNetworkId: IdType
  currentTable: Table | undefined
  nodeTable: Table | undefined
  postEdit: (
    type: UndoCommandType,
    description: string,
    undoArgs: any[],
    redoArgs: any[],
  ) => void
  setValues: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    cellEdits: CellEdit[],
  ) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

export const handlePaste = ({
  target,
  values,
  rows,
  allColumns,
  currentNetworkId,
  currentTable,
  nodeTable,
  postEdit,
  setValues,
  setNetworkModified,
}: HandlePasteArgs): boolean => {
  const [startCol, startRow] = target
  const cellEdits: CellEdit[] = []
  const prevCellEdits: CellEdit[] = []

  for (let dy = 0; dy < values.length; dy++) {
    const rowIndex = startRow + dy
    const rowData = rows?.[rowIndex]
    if (rowData == null) continue

    for (let dx = 0; dx < values[dy].length; dx++) {
      const colIndex = startCol + dx
      const column = allColumns?.[colIndex]
      if (column == null || (column as any).isVirtual) continue

      const pastedString = values[dy][dx]
      if (!serializedStringIsValid(column.type, pastedString)) continue

      const newValue = deserializeValue(column.type, pastedString)
      const prevValue = (rowData as any)?.[column.id] as ValueType

      cellEdits.push({
        row: rowData.id,
        column: column.id,
        value: newValue as ValueType,
      })
      prevCellEdits.push({
        row: rowData.id,
        column: column.id,
        value: prevValue,
      })
    }
  }

  if (cellEdits.length > 0) {
    const elementType = currentTable === nodeTable ? 'node' : 'edge'
    postEdit(
      UndoCommandType.APPLY_VALUE_TO_SELECTED,
      'Paste cell values',
      [currentNetworkId, elementType, prevCellEdits],
      [currentNetworkId, elementType, cellEdits],
    )
    setValues(currentNetworkId, elementType, cellEdits)
    setNetworkModified(currentNetworkId, true)
  }

  return false
}
