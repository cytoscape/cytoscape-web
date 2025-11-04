import { Column, Table } from '..'
import { IdType } from '../../IdType'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'

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
  table.rows.set(idRowPair[0], idRowPair[1])
  return table
}

export const insertRows = (
  table: Table,
  idRowPairs: Array<[IdType, Record<AttributeName, ValueType>]>,
): Table => {
  idRowPairs.forEach((idRow) => table.rows.set(idRow[0], idRow[1]))
  return table
}

export const updateRow = (
  table: Table,
  idRowPair: [IdType, Record<AttributeName, ValueType>],
): Table => {
  table.rows.set(idRowPair[0], idRowPair[1])
  return table
}
