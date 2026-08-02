import { GridCell, GridCellKind, Item } from '@glideapps/glide-data-grid'
import type { Theme } from '@mui/material'

import { ValueTypeName } from '../../../models/TableModel'
import { isListType, valueDisplay } from '../../../models/TableModel/impl/valueTypeImpl'
import { isValidUrl } from '../../../utils/urlUtil'

export const getCellKind = (type: ValueTypeName): GridCellKind => {
  const valueTypeName2CellTypeMap: Record<ValueTypeName, GridCellKind> = {
    [ValueTypeName.String]: GridCellKind.Text,
    [ValueTypeName.Long]: GridCellKind.Number,
    [ValueTypeName.Integer]: GridCellKind.Number,
    [ValueTypeName.Double]: GridCellKind.Number,
    [ValueTypeName.Boolean]: GridCellKind.Boolean,
    [ValueTypeName.ListString]: GridCellKind.Text,
    [ValueTypeName.ListLong]: GridCellKind.Text,
    [ValueTypeName.ListInteger]: GridCellKind.Text,
    [ValueTypeName.ListDouble]: GridCellKind.Text,
    [ValueTypeName.ListBoolean]: GridCellKind.Text,
  }
  return valueTypeName2CellTypeMap[type] ?? GridCellKind.Text
}

export interface HandleGetCellContentArgs {
  cell: Item
  rows?: any[]
  allColumns?: any[]
  theme: Theme
}

export const handleGetCellContent = ({
  cell,
  rows,
  allColumns,
  theme,
}: HandleGetCellContentArgs): GridCell => {
  const [columnIndex, rowIndex] = cell
  const dataRow = rows?.[rowIndex]
  const column = allColumns?.[columnIndex]
  const columnKey = column?.id

  // Handle virtual columns
  if ((column as any)?.isVirtual) {
    const virtualColumn = column as any
    const cellValue = virtualColumn.getValue(dataRow)
    return {
      cursor: 'not-allowed',
      themeOverride: {
        bgCell: theme.palette.background.default,
        textDark: theme.palette.text.disabled,
      },
      allowOverlay: false, // Virtual columns are read-only
      readonly: true,
      kind: GridCellKind.Text,
      displayData: String(cellValue),
      data: String(cellValue),
    }
  }

  if (dataRow == null || column == null) {
    return {
      allowOverlay: true,
      readonly: false,
      kind: GridCellKind.Text,
      displayData: '',
      data: '',
    }
  }

  // Handle regular columns
  const cellValue = (dataRow as any)?.[columnKey]
  if (cellValue == null) {
    return {
      allowOverlay: true,
      readonly: false,
      kind: GridCellKind.Text,
      displayData: '',
      data: '',
    }
  }

  const cellType = getCellKind(column.type)
  const processedCellValue = valueDisplay(cellValue, column.type)

  // List-typed cells (CW-563) are not edited inline: typing into a text
  // overlay collapsed multi-item lists into a single element. They are
  // shown read-only here and edited through the dedicated list editor
  // dialog, opened via onCellActivated.
  if (isListType(column.type)) {
    return {
      kind: GridCellKind.Text,
      allowOverlay: false,
      readonly: true,
      displayData: String(processedCellValue),
      data: String(processedCellValue),
    }
  }

  // These cells generally prevent users from inputting mismatched data types
  // e.g. a user can't but a boolean in a number, a string in a number, etc.
  // The exception is that users can still input floats into integer columns
  // Extra validation for this logic is done in onCellEdited
  if (cellType === GridCellKind.Boolean) {
    return {
      allowOverlay: false,
      kind: cellType,
      readonly: false,
      data: processedCellValue as boolean,
    }
  } else if (cellType === GridCellKind.Number) {
    return {
      allowOverlay: true,
      kind: cellType,
      readonly: false,
      displayData: String(processedCellValue),
      data: processedCellValue as number,
    }
  } else {
    if (isValidUrl(String(processedCellValue))) {
      return {
        kind: GridCellKind.Uri,
        allowOverlay: true,
        readonly: false,
        data: processedCellValue as string,
      }
    }
    return {
      kind: GridCellKind.Text,
      allowOverlay: true,
      displayData: String(processedCellValue),
      readonly: false,
      data: processedCellValue as string,
    }
  }
}
