import { Table } from '.'
import { IdType } from '../IdType'
import { Column } from './Column'
import { Row } from './Row'

export const createTable = (id: IdType): Table => {
  return {
    id,
    columns: [],
    rows: [],
  }
}

export const addColumn = (table: Table, columns: Column[]): Table => {
  const newColumns: Column[] = [...table.columns, ...columns]
  table.columns = newColumns
  return table
}

export const addRow = (table: Table, rows: Row[]): Table => {
  const newRows: Row[] = [...table.rows, ...rows]
  table.rows = newRows
  return table
}
