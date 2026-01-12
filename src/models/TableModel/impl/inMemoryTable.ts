import { IdType } from '../../IdType'
import { Column, Table } from '..'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'

export const createTable = (
  id: IdType,
  cols: Column[] = [],
  data?: Map<IdType, Record<AttributeName, ValueType>>,
): Table => {
  const rows = data ?? new Map<IdType, Record<AttributeName, ValueType>>()
  return {
    id,
    columns: [...cols],
    rows,
  }
}

// Utility function to get list of columns from a table
export const columns = (table: Table): Column[] =>
  Array.from(table.columns.values())

export const addColumn = (table: Table, columns: Column[]): Table => {
  // const newColumns: Column[] = [...table.columns, ...columns]
  // table.columns = newColumns
  return table
}

export const columnValueSet = (
  table: Table,
  columnName: string,
  includeNullOrUndefined = false,
): Set<ValueType> => {
  const values = new Set<ValueType>()
  table.rows.forEach((row) => {
    const value = row[columnName]

    if (value != null) {
      values.add(value)
    } else if (includeNullOrUndefined) {
      values.add(value)
    }
  })
  return values
}

export const insertRow = (
  table: Table,
  idRowPair: [IdType, Record<AttributeName, ValueType>],
): Table => {
  const newRows = new Map(table.rows)
  newRows.set(idRowPair[0], idRowPair[1])
  return {
    ...table,
    rows: newRows,
  }
}

export const insertRows = (
  table: Table,
  idRowPairs: Array<[IdType, Record<AttributeName, ValueType>]>,
): Table => {
  const newRows = new Map(table.rows)
  idRowPairs.forEach((idRow) => newRows.set(idRow[0], idRow[1]))
  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Add a row with default values for all columns
 * 
 * @param table - The table to add the row to
 * @param rowId - The ID for the new row
 * @param customValues - Optional custom values to override defaults
 * @returns Updated table with the new row
 */
export const addRowWithDefaults = (
  table: Table,
  rowId: IdType,
  customValues?: Partial<Record<AttributeName, ValueType>>,
): Table => {
  // Create default values for all columns
  const defaultRow: Record<AttributeName, ValueType> = {}
  
  table.columns.forEach((column) => {
    // Set default value based on type
    switch (column.type) {
      case ValueTypeName.String:
        defaultRow[column.name] = ''
        break
      case ValueTypeName.Long:
      case ValueTypeName.Integer:
      case ValueTypeName.Double:
        defaultRow[column.name] = 0
        break
      case ValueTypeName.Boolean:
        defaultRow[column.name] = false
        break
      case ValueTypeName.ListString:
        defaultRow[column.name] = []
        break
      case ValueTypeName.ListLong:
      case ValueTypeName.ListInteger:
      case ValueTypeName.ListDouble:
        defaultRow[column.name] = []
        break
      case ValueTypeName.ListBoolean:
        defaultRow[column.name] = []
        break
      default:
        defaultRow[column.name] = ''
    }
  })
  
  // Override with custom values if provided
  if (customValues) {
    Object.keys(customValues).forEach((key) => {
      const value = customValues[key]
      if (value !== undefined) {
        defaultRow[key] = value
      }
    })
  }
  
  return insertRow(table, [rowId, defaultRow])
}

export const updateRow = (
  table: Table,
  idRowPair: [IdType, Record<AttributeName, ValueType>],
): Table => {
  const newRows = new Map(table.rows)
  newRows.set(idRowPair[0], idRowPair[1])
  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Move a column to a new position
 */
export const moveColumn = (
  table: Table,
  columnIndex: number,
  newColumnIndex: number,
): Table => {
  const newColumns = [...table.columns]
  const column = newColumns[columnIndex]
  newColumns.splice(columnIndex, 1)
  newColumns.splice(newColumnIndex, 0, column)

  return {
    ...table,
    columns: newColumns,
  }
}

/**
 * Rename a column
 */
export const setColumnName = (
  table: Table,
  currentColumnName: AttributeName,
  newColumnName: AttributeName,
): Table => {
  const columnIndex = table.columns.findIndex(
    (c) => c.name === currentColumnName,
  )
  if (columnIndex === -1) {
    return table
  }

  const newColumns = [...table.columns]
  const column = newColumns[columnIndex]
  newColumns[columnIndex] = {
    ...column,
    name: newColumnName,
  }

  const newRows = new Map<IdType, Record<AttributeName, ValueType>>()
  table.rows.forEach((row, id) => {
    const newRow: Record<AttributeName, ValueType> = { ...row }
    const value = newRow[currentColumnName]
    if (value !== undefined) {
      delete newRow[currentColumnName]
      newRow[newColumnName] = value
    }
    newRows.set(id, newRow)
  })

  return {
    ...table,
    columns: newColumns,
    rows: newRows,
  }
}

/**
 * Apply a value to specific elements or all elements
 */
export const applyValueToElements = (
  table: Table,
  columnName: AttributeName,
  value: ValueType,
  elementIds?: IdType[],
): Table => {
  const newRows = new Map<IdType, Record<AttributeName, ValueType>>()

  if (elementIds != null) {
    table.rows.forEach((row, id) => {
      const newRow: Record<AttributeName, ValueType> = { ...row }
      if (elementIds.includes(id)) {
        newRow[columnName] = value
      }
      newRows.set(id, newRow)
    })
  } else {
    table.rows.forEach((row, id) => {
      const newRow: Record<AttributeName, ValueType> = { ...row }
      newRow[columnName] = value
      newRows.set(id, newRow)
    })
  }

  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Delete a column from the table
 */
export const deleteColumn = (
  table: Table,
  columnName: AttributeName,
): Table => {
  const columnIndex = table.columns.findIndex((c) => c.name === columnName)
  if (columnIndex === -1) {
    return table
  }

  const newColumns = [...table.columns]
  newColumns.splice(columnIndex, 1)

  const newRows = new Map<IdType, Record<AttributeName, ValueType>>()
  table.rows.forEach((row, id) => {
    const newRow: Record<AttributeName, ValueType> = { ...row }
    delete newRow[columnName]
    newRows.set(id, newRow)
  })

  return {
    ...table,
    columns: newColumns,
    rows: newRows,
  }
}

/**
 * Create a new column at the beginning
 */
export const createColumn = (
  table: Table,
  columnName: AttributeName,
  dataType: ValueTypeName,
  value: ValueType,
): Table => {
  const newColumn: Column = {
    name: columnName,
    type: dataType,
  }
  const newColumns = [newColumn, ...table.columns]

  const newRows = new Map<IdType, Record<AttributeName, ValueType>>()
  table.rows.forEach((row, id) => {
    const newRow: Record<AttributeName, ValueType> = {
      ...row,
      [columnName]: value,
    }
    newRows.set(id, newRow)
  })

  return {
    ...table,
    columns: newColumns,
    rows: newRows,
  }
}

/**
 * Set a value for a specific cell
 */
export const setValue = (
  table: Table,
  rowId: IdType,
  column: AttributeName,
  value: ValueType,
): Table => {
  const row = table.rows.get(rowId)
  if (row == null) {
    return table
  }

  const newRows = new Map(table.rows)
  const newRow: Record<AttributeName, ValueType> = {
    ...row,
    [column]: value,
  }
  newRows.set(rowId, newRow)

  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Set multiple cell values
 */
export const setValues = (
  table: Table,
  cellEdits: Array<{ row: IdType; column: AttributeName; value: ValueType }>,
): Table => {
  const newRows = new Map(table.rows)

  cellEdits.forEach((cellEdit) => {
    const row = newRows.get(cellEdit.row)
    if (row != null) {
      const newRow: Record<AttributeName, ValueType> = {
        ...row,
        [cellEdit.column]: cellEdit.value,
      }
      newRows.set(cellEdit.row, newRow)
    }
  })

  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Duplicate a column
 */
export const duplicateColumn = (
  table: Table,
  columnName: AttributeName,
): Table => {
  const columnIndex = table.columns.findIndex((c) => c.name === columnName)
  if (columnIndex === -1) {
    return table
  }

  const columnToDuplicate = table.columns[columnIndex]
  const newColumn: Column = {
    ...columnToDuplicate,
    name: `${columnToDuplicate.name}_copy_${Date.now()}` as AttributeName,
  }

  const newColumns = [...table.columns]
  newColumns.splice(columnIndex + 1, 0, newColumn)

  const newRows = new Map<IdType, Record<AttributeName, ValueType>>()
  table.rows.forEach((row, id) => {
    const newRow: Record<AttributeName, ValueType> = {
      ...row,
      [newColumn.name]: row[columnName],
    }
    newRows.set(id, newRow)
  })

  return {
    ...table,
    columns: newColumns,
    rows: newRows,
  }
}

/**
 * Delete rows from the table
 */
export const deleteRows = (table: Table, rowIds: IdType[]): Table => {
  if (rowIds.length === 0) {
    return table
  }

  const newRows = new Map(table.rows)
  rowIds.forEach((rowId) => {
    newRows.delete(rowId)
  })

  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Edit multiple rows
 */
export const editRows = (
  table: Table,
  rows: Map<IdType, Record<AttributeName, ValueType>>,
): Table => {
  const newRows = new Map(table.rows)
  rows.forEach((row, id) => {
    newRows.set(id, row)
  })

  return {
    ...table,
    rows: newRows,
  }
}

/**
 * Set the entire table
 */
export const setTable = (table: Table): Table => {
  return table
}
