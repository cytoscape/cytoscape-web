import TableFn, { Column, Row, Table } from '..'
import { IdType } from '../../IdType'
import { AttributeName } from '../AttributeName'
import { ValueType } from '../ValueType'
import { ValueTypeName } from '../ValueTypeName'

export const createTable = (id: IdType): Table => ({
  id,
  columns: new Map<AttributeName, ValueTypeName>(),
  rows: new Map<IdType, Record<AttributeName, ValueType>>(),
})

// Utility function to get list of columns from a table
export const getColumns = (table: Table): Column[] =>
  [...table.columns.keys()].map((name: AttributeName) => ({
    name,
    type: table.columns.get(name) as ValueTypeName,
  }))

export const addColumn = (table: Table, columns: Column[]): Table => {
  // const newColumns: Column[] = [...table.columns, ...columns]
  // table.columns = newColumns
  return table
}

export const insertRow = (
  table: Table,
  row: Record<IdType, ValueType>,
  id: IdType,
): Table => {
  table.rows.set(id, row)
  return table
}
