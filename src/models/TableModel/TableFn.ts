import { Cx2 } from '../../utils/cx/Cx2'
import { IdType } from '../IdType'
import { Table, Column } from '.'

export interface TableFn {
  createTable: (id: IdType) => Table
  createTablesFromCx: (cx: Cx2) => [Table, Table]
  columns: (table: Table) => Column[]
  addColumn: (table: Table, columns: Column[]) => Table
}
