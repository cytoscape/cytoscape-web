import { IdType } from '../models/IdType'
import { AttributeName, Table, ValueType } from '../models/TableModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
//  * Table State manager based on zustand
//  */
interface TableState {
  tables: Record<IdType, { nodeTable: Table; edgeTable: Table }>
}

interface TableAction {
  setTables: (networkId: IdType, nodeTable: Table, edgeTable: Table) => void
  setValue: (
    networkId: IdType,
    table: 'node' | 'edge',
    row: IdType,
    column: string,
    value: ValueType,
  ) => void
}

export const useTableStore = create(
  immer<TableState & TableAction>((set) => ({
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
        const tableToUpdate = tableType === 'node' ? 'nodeTable' : 'edgeTable'
        const row = table[tableToUpdate]?.rows.get(rowId)
        if (row != null) {
          row[column] = value
        }
      })
    },
  })),
)
