import { IdType } from '../models/IdType'
import { AttributeName, Table, ValueType } from '../models/TableModel'

import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { columnValueSet } from '../models/TableModel/impl/InMemoryTable'
import { VisualPropertyGroup } from '../models/VisualStyleModel/VisualPropertyGroup'
import { useWorkspaceStore } from './WorkspaceStore'
import {
  clearTablesFromDb,
  deleteTablesFromDb,
  putTablesToDb,
} from './persist/db'
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

export const TableType = {
  NODE: 'node',
  EDGE: 'edge',
} as const

export type TableType = (typeof TableType)[keyof typeof TableType]

interface TableAction {
  // Add a new table to the store
  add: (networkId: IdType, nodeTable: Table, edgeTable: Table) => void


  setColumnName: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    currentColumnName: string,
    newColumnName: string
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

  // Delete rows from the table. Should be called (via event) when nodes/edges are deleted
  deleteRows: (networkId: IdType, rows: IdType[]) => void

  // Create new
  addRows: (networkId: IdType, rows: IdType[]) => void

  delete: (networkId: IdType) => void
  deleteAll: () => void
}

type TableStore = TableState & TableAction

const persist =
  (config: StateCreator<TableStore>) =>
    (
      set: StoreApi<TableStore>['setState'],
      get: StoreApi<TableStore>['getState'],
      api: StoreApi<TableStore>,
    ) =>
      config(
        async (args) => {
          const currentNetworkId =
            useWorkspaceStore.getState().workspace.currentNetworkId
          console.log('persist middleware updating table store')
          set(args)
          const updated = get().tables[currentNetworkId]
          console.log('updated table: ', updated)
          const deleted = updated === undefined
          if (!deleted) {
            await putTablesToDb(
              currentNetworkId,
              updated.nodeTable,
              updated.edgeTable,
            ).then(() => { })
          }
        },
        get,
        api,
      )

export const useTableStore = create(
  immer<TableStore>(
    persist((set, get) => ({
      tables: {},

      add: (networkId: IdType, nodeTable: Table, edgeTable: Table) => {
        set((state) => {
          state.tables[networkId] = { nodeTable, edgeTable }
          return state
        })
      },

      setColumnName: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        currentColumnName: string,
        newColumnName: string
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableToUpdate =
            table[tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable']


          const column = tableToUpdate.columns.get(currentColumnName)
          if (column != null) {
            tableToUpdate.columns.delete(currentColumnName)
            tableToUpdate.columns.set(newColumnName, column)
          }

          const rows = tableToUpdate.rows.values()
          Array.from(rows).forEach(row => {
            const v = row[currentColumnName]
            delete row[currentColumnName]
            row[newColumnName] = v
          })
          // Object.entries(rows)).forEach(([key, v]) => {
          //   const value = rows[key]
          //   if (value != null) {
          //     delete row[currentColumnName]
          //     row[newColumnName] = value
          //   }
          // })
          return state

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
          return state
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

          return state
        })
      },

      deleteRows: (networkId: IdType, rowIds: IdType[]) => {
        set((state) => {
          if (rowIds.length === 0) {
            return state
          }

          const table = state.tables
          const nodeTable = table[networkId]?.nodeTable
          const edgeTable = table[networkId]?.edgeTable
          const nodeRows = nodeTable.rows
          const edgeRows = edgeTable.rows
          rowIds.forEach((rowId) => {
            if (nodeRows.has(rowId)) {
              nodeRows.delete(rowId)
            } else if (edgeRows.has(rowId)) {
              edgeRows.delete(rowId)
            }
          })
          return state
        })
      },
      addRows: (networkId: IdType, rowIds: IdType[]) => {
        set((state) => {
          if (rowIds.length === 0) {
            return state
          }
          return state
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

          void deleteTablesFromDb(networkId).then(() => {
            console.log('Deleted network table from db', networkId)
          })
          return state
        })
      },
      deleteAll() {
        set((state) => {
          state.tables = {}
          clearTablesFromDb()
            .then(() => {
              console.log('Deleted all network tables from db')
            })
            .catch((err) => {
              console.error('Error clearing  all attribute tables from db', err)
            })

          return state
        })
      },
    })),
  ),
)
