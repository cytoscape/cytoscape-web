import { EditableGridCell, Item } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { Table, ValueType, ValueTypeName } from '../../../models/TableModel'
import {
  deserializeValueList,
  isListType,
  serializedStringIsValid,
} from '../../../models/TableModel/impl/valueTypeImpl'

export interface HandleCellEditArgs {
  cell: Item
  newValue: EditableGridCell
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
  setCellValue: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    cxId: string,
    columnKey: string,
    value: ValueType,
  ) => void
}

export const handleCellEdit = ({
  cell,
  newValue,
  rows,
  allColumns,
  currentTable,
  nodeTable,
  currentNetworkId,
  postEdit,
  setCellValue,
}: HandleCellEditArgs): void => {
  const [columnIndex, rowIndex] = cell
  const rowData = rows?.[rowIndex]
  const cxId = rowData?.id
  const column = allColumns?.[columnIndex]
  const columnKey = column?.id
  let data = newValue.data

  if (rowData == null || cxId == null || column == null || data == null) return

  const prevCellValue = (rowData as any)?.[columnKey]
  const elementType = currentTable === nodeTable ? 'node' : 'edge'

  if (isListType(column.type)) {
    if (serializedStringIsValid(column.type, data as string)) {
      data = deserializeValueList(column.type, data as string)
      postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'Set cell value',
        [currentNetworkId, elementType, cxId, columnKey, prevCellValue],
        [currentNetworkId, elementType, cxId, columnKey, data as ValueType],
      )
      setCellValue(
        currentNetworkId,
        elementType,
        `${cxId}`,
        columnKey,
        data as ValueType,
      )
    }
  } else {
    if (
      column.type !== ValueTypeName.Integer &&
      column.type !== ValueTypeName.Long
    ) {
      postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'Set cell value',
        [currentNetworkId, elementType, cxId, columnKey, prevCellValue],
        [currentNetworkId, elementType, cxId, columnKey, data as ValueType],
      )
      setCellValue(
        currentNetworkId,
        elementType,
        `${cxId}`,
        columnKey,
        data as ValueType,
      )
    } else {
      if (Number.isInteger(data)) {
        postEdit(
          UndoCommandType.SET_CELL_VALUE,
          'Set cell value',
          [currentNetworkId, elementType, cxId, columnKey, prevCellValue],
          [
            currentNetworkId,
            elementType,
            cxId,
            columnKey,
            parseFloat(data as string),
          ],
        )
        setCellValue(
          currentNetworkId,
          elementType,
          `${cxId}`,
          columnKey,
          parseFloat(data as string),
        )
      } else {
        // the user is trying to assign a double value to a integer column.  Ignore this value.
      }
    }
  }
}
