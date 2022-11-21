import { IdType } from '../models/IdType'
import { Table } from '../models/TableModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'

/**
//  * Table State manager based on zustand
//  */
interface TableState {
  tables: Record<IdType, { nodeTable: Table; edgeTable: Table }>
}

// /**
//  * Actions to mutate visual style structure
//  */
// interface UpdateVisualStyleAction {
// }

interface TableAction {
  setTables: (id: IdType, nodeTable: Table, edgeTable: Table) => void
}

export const useTableStore = create(
  immer<TableState & TableAction>((set) => ({
    tables: {},

    setTables: (id: IdType, nodeTable: Table, edgeTable: Table) => {
      set((state) => {
        state.tables[id] = { nodeTable, edgeTable }
      })
    },
  })),
)
