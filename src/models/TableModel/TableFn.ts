import { IdType } from '../IdType'
import { Table, Column } from '.'

export interface TableFn {
  createTable: (id: IdType) => Table
  columns: (table: Table) => Column[]
  addColumn: (table: Table, columns: Column[]) => Table
}
