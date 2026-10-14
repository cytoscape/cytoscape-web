import type { IdType } from '../IdType'
import type { Column } from './Column'
import type { Table } from './Table'

export interface TableFn {
  createTable: (id: IdType) => Table
  columns: (table: Table) => Column[]
  addColumn: (table: Table, columns: Column[]) => Table
}
