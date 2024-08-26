import { IdType } from '../models/IdType'
import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../models/TableModel'

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
import {
  TableRecord,
  TableStore,
  TableType,
} from '../models/StoreModel/TableStoreModel'

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
        set(args)
        const updated = get().tables[currentNetworkId]
        const deleted = updated === undefined
        if (!deleted) {
          await putTablesToDb(
            currentNetworkId,
            updated.nodeTable,
            updated.edgeTable,
          ).then(() => {})
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
          if (state.tables[networkId] !== undefined) {
            console.warn('Table already exists for network', networkId)
            return state
          }
          state.tables[networkId] = { nodeTable, edgeTable }
          void putTablesToDb(networkId, nodeTable, edgeTable)
            .then(() => {
              console.debug('Added tables to DB', networkId)
            })
            .catch((err) => {
              console.error('Error adding tables to DB', err)
            })
          return state
        })
      },

      moveColumn: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        columnIndex: number,
        newColumnIndex: number,
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableTypeKey =
            tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
          const tableToUpdate = table?.[tableTypeKey]

          if (tableToUpdate != null) {
            const column = tableToUpdate.columns[columnIndex]
            tableToUpdate.columns.splice(columnIndex, 1)
            tableToUpdate.columns.splice(newColumnIndex, 0, column)

            const rows = tableToUpdate.rows.values()
            Array.from(rows).forEach((row) => {
              const v = row[column.name]
              delete row[column.name]
              row[column.name] = v
            })

            state.tables[networkId][tableTypeKey] = tableToUpdate
          }

          return state
        })
      },

      setColumnName: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        currentColumnName: string,
        newColumnName: string,
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableTypeKey =
            tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
          const tableToUpdate = table[tableTypeKey]

          const columnIndex = tableToUpdate.columns.findIndex(
            (c) => c.name === currentColumnName,
          )
          if (columnIndex !== -1) {
            const column = tableToUpdate.columns[columnIndex]
            const newColumn = { ...column, name: newColumnName }
            tableToUpdate.columns[columnIndex] = newColumn
          }

          const rows = tableToUpdate.rows.values()
          Array.from(rows).forEach((row) => {
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

          state.tables[networkId][tableTypeKey] = tableToUpdate
          return state
        })
      },

      applyValueToElements: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        columnName: string,
        value: ValueType,
        elementIds: IdType[] | undefined,
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableToUpdate =
            table[
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ]

          if (elementIds != null) {
            elementIds.forEach((id) => {
              const row = tableToUpdate.rows.get(id)
              if (row != null) {
                row[columnName] = value
              }
            })
          } else {
            Array.from(tableToUpdate.rows.values()).forEach((row) => {
              row[columnName] = value
            })
          }
          return state
        })
      },

      deleteColumn: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        columnName: string,
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableToUpdate =
            table[
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ]

          const columnIndex = tableToUpdate.columns.findIndex(
            (c) => c.name === columnName,
          )
          if (columnIndex !== -1) {
            tableToUpdate.columns.splice(columnIndex)
          }

          const rows = tableToUpdate.rows.values()
          Array.from(rows).forEach((row) => {
            delete row[columnName]
          })

          return state
        })
      },

      createColumn: (
        networkId: IdType,
        tableType: 'node' | 'edge',
        columnName: string,
        dataType: ValueTypeName,
        value: ValueType,
      ) => {
        set((state) => {
          const table = state.tables[networkId]
          const tableToUpdate =
            table[
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ]

          tableToUpdate.columns.unshift({
            name: columnName,
            type: dataType,
          })

          const rows = tableToUpdate.rows.values()
          Array.from(rows).forEach((row) => {
            row[columnName] = value
          })

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
        columnName: AttributeName,
      ) {
        set((state) => {
          const table = state.tables
          const nodeTable = table[networkId]?.nodeTable
          const edgeTable = table[networkId]?.edgeTable
          const tableToUpdate =
            tableType === VisualPropertyGroup.Node ? nodeTable : edgeTable
          const columnIndex = tableToUpdate.columns.findIndex(
            (c) => c.name === columnName,
          )
          if (columnIndex !== -1) {
            const columnToDuplicate = tableToUpdate.columns[columnIndex]
            const newColumn = {
              ...columnToDuplicate,
              name: `${columnToDuplicate.name}_copy_${Date.now()}`,
            }
            tableToUpdate?.columns.unshift(newColumn)

            Array.from((tableToUpdate?.rows ?? new Map()).entries()).forEach(
              ([nodeId, nodeAttr]) => {
                nodeAttr[newColumn.name] = nodeAttr[columnName]
                tableToUpdate.rows.set(nodeId, nodeAttr)
              },
            )
          }

          return state
        })
      },

      setTable: (networkId: IdType, tableType: TableType, table: Table) => {
        set((state) => {
          if (tableType === TableType.NODE) {
            state.tables[networkId].nodeTable = table
          } else {
            state.tables[networkId].edgeTable = table
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
