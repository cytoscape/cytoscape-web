import { IdType } from '../models/IdType'
import { AttributeName, Table, ValueType } from '../models/TableModel'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { columnValueSet } from '../models/TableModel/impl/InMemoryTable'
import { VisualPropertyGroup } from '../models/VisualStyleModel/VisualPropertyGroup'

/** */
interface TableRecord {
  nodeTable: Table
  edgeTable: Table
}

/**
//  * Table State manager based on zustand
//  */
interface TableState {
  tables: Record<IdType, TableRecord>
}

interface TableAction {
  setTables: (networkId: IdType, nodeTable: Table, edgeTable: Table) => void
  setValue: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    row: IdType,
    column: string,
    value: ValueType,
  ) => void
  columnValues: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    column: AttributeName,
  ) => Set<ValueType>
  duplicateColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    column: AttributeName,
  ) => void
  delete: (networkId: IdType) => void
  deleteAll: () => void
}

export const useTableStore = create(
  immer<TableState & TableAction>((set, get) => ({
    tables: {},

    setTables: (networkId: IdType, nodeTable: Table, edgeTable: Table) => {
      set((state) => {
        state.tables[networkId] = { nodeTable, edgeTable }
      })
    },

    // Note:  The only code that calls this function makes sure the
    // type of the column is the same as the type of the value
    // TODO add type checking validation to this function
    setValue: (
      networkId: IdType,
      tableType: 'node' | 'edge',
      rowId: IdType,
      column: AttributeName,
      value: ValueType,
    ) => {
      set((state) => {
        const table = state.tables[networkId]
        const tableToUpdate =
          tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
        const row = table[tableToUpdate]?.rows.get(rowId)
        if (row != null) {
          row[column] = value
        }
      })
    },
    columnValues: (
      networkId: IdType,
      tableType: 'node' | 'edge',
      column: AttributeName,
    ): Set<ValueType> => {
      const tables = get().tables
      const nodeTable = tables[networkId]?.nodeTable
      const edgeTable = tables[networkId]?.edgeTable
      const table =
        tableType === VisualPropertyGroup.Node ? nodeTable : edgeTable

      return columnValueSet(table, column)
    },
    duplicateColumn(
      networkId: IdType,
      tableType: 'node' | 'edge',
      column: AttributeName,
    ) {
      set((state) => {
        const table = state.tables
        const nodeTable = table[networkId]?.nodeTable
        const edgeTable = table[networkId]?.edgeTable
        const tableToUpdate =
          tableType === VisualPropertyGroup.Node ? nodeTable : edgeTable
        const columnToDuplicate = tableToUpdate?.columns.get(column)
        if (columnToDuplicate != null) {
          const newColumn = {
            ...columnToDuplicate,
            name: `${columnToDuplicate.name}_copy_${Date.now()}`,
          }
          tableToUpdate?.columns.set(newColumn.name, newColumn)

          Array.from((tableToUpdate?.rows ?? new Map()).entries()).forEach(
            ([nodeId, nodeAttr]) => {
              nodeAttr[newColumn.name] = nodeAttr[column]
              tableToUpdate.rows.set(nodeId, nodeAttr)
            },
          )
        }
      })
    },
    delete(networkId: IdType) {
      set((state) => {
        const filtered: Record<IdType, TableRecord> = Object.keys(
          state.tables,
        ).reduce((acc: Record<IdType, TableRecord>, id) => {
          if (id !== networkId) {
            acc[id] = state.tables[id]
          }
          return acc
        }, {})
        state.tables = filtered
      })
    },
    deleteAll() {
      set((state) => {
        state.tables = {}
      })
    },
  })),
)
