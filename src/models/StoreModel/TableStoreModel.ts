import { IdType } from '../../models/IdType'
import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../../models/TableModel'
export interface TableRecord {
  nodeTable: Table
  edgeTable: Table
}

export interface TableState {
  tables: Record<IdType, TableRecord>
}

export const TableType = {
  NODE: 'node',
  EDGE: 'edge',
} as const

export type TableType = (typeof TableType)[keyof typeof TableType]

export interface TableAction {
  // Add a new table to the store
  add: (networkId: IdType, nodeTable: Table, edgeTable: Table) => void

  deleteColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnName: string,
  ) => void

  applyValueToElements: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnName: string,
    value: ValueType,
    elementIds: IdType[] | undefined,
  ) => void
  createColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnName: string,
    dataType: ValueTypeName,
    value: ValueType,
  ) => void
  setColumnName: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    currentColumnName: string,
    newColumnName: string,
  ) => void
  moveColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnIndex: number,
    newColumnIndex: number,
  ) => void
  setValue: (
    networkId: IdType,
    tableType: TableType,
    row: IdType,
    column: string,
    value: ValueType,
  ) => void
  columnValues: (
    networkId: IdType,
    tableType: TableType,
    column: AttributeName,
  ) => Set<ValueType>
  duplicateColumn: (
    networkId: IdType,
    tableType: TableType,
    column: AttributeName,
  ) => void

  // update table(s)
  setTable: (networkId: IdType, tableType: TableType, table: Table) => void

  // Delete rows from the table. Should be called (via event) when nodes/edges are deleted
  deleteRows: (networkId: IdType, rows: IdType[]) => void

  // Create new
  addRows: (networkId: IdType, rows: IdType[]) => void

  delete: (networkId: IdType) => void
  deleteAll: () => void
}

export type TableStore = TableState & TableAction
