/**
 * @deprecated The Module Federation exposure of this store (cyweb/TableStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/TableStore Module Federation export will be removed after 2 release cycles.
 */
import { create, StateCreator, StoreApi } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { clearTablesFromDb, deleteTablesFromDb, putTablesToDb } from '../../db'
import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import {
  CellEdit,
  TableRecord,
  TableStore,
  TableType,
} from '../../../models/StoreModel/TableStoreModel'
import {
  AttributeName,
  Table,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import * as TableImpl from '../../../models/TableModel/impl/inMemoryTable'
import { VisualPropertyGroup } from '../../../models/VisualStyleModel/VisualPropertyGroup'
import { useWorkspaceStore } from './WorkspaceStore'

const persist =
  (config: StateCreator<TableStore>) =>
  (
    set: StoreApi<TableStore>['setState'],
    get: StoreApi<TableStore>['getState'],
    api: StoreApi<TableStore>,
  ) =>
    config(
      async (args) => {
        logStore.info('[TableStore]: Persisting table store')
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
  subscribeWithSelector(
    immer<TableStore>(
      persist((set, get) => ({
        tables: {},

        add: (networkId: IdType, nodeTable: Table, edgeTable: Table) => {
          set((state) => {
            if (state.tables[networkId] !== undefined) {
              logStore.warn(
                `[${useTableStore.name}]: Table already exists for network: ${networkId}`,
              )
            }
            state.tables[networkId] = { nodeTable, edgeTable }
            void putTablesToDb(networkId, nodeTable, edgeTable)

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
              state.tables[networkId][tableTypeKey] = TableImpl.moveColumn(
                tableToUpdate,
                columnIndex,
                newColumnIndex,
              )
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

            state.tables[networkId][tableTypeKey] = TableImpl.setColumnName(
              tableToUpdate,
              currentColumnName,
              newColumnName,
            )
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
                tableType === VisualPropertyGroup.Node
                  ? 'nodeTable'
                  : 'edgeTable'
              ]

            state.tables[networkId][
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ] = TableImpl.applyValueToElements(
              tableToUpdate,
              columnName,
              value,
              elementIds,
            )
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
                tableType === VisualPropertyGroup.Node
                  ? 'nodeTable'
                  : 'edgeTable'
              ]

            state.tables[networkId][
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ] = TableImpl.deleteColumn(tableToUpdate, columnName)

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
                tableType === VisualPropertyGroup.Node
                  ? 'nodeTable'
                  : 'edgeTable'
              ]

            state.tables[networkId][
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            ] = TableImpl.createColumn(
              tableToUpdate,
              columnName,
              dataType,
              value,
            )

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
            const tableToModify = table[tableToUpdate]

            if (tableToModify != null) {
              state.tables[networkId][tableToUpdate] = TableImpl.setValue(
                tableToModify,
                rowId,
                column,
                value,
              )
            }
            return state
          })
        },
        setValues: (
          networkId: IdType,
          tableType: 'node' | 'edge',
          cellEdits: CellEdit[],
        ) => {
          set((state) => {
            const table = state.tables[networkId]
            const tableToUpdate =
              tableType === VisualPropertyGroup.Node ? 'nodeTable' : 'edgeTable'
            const tableToModify = table[tableToUpdate]

            if (tableToModify != null) {
              state.tables[networkId][tableToUpdate] = TableImpl.setValues(
                tableToModify,
                cellEdits,
              )
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

          return TableImpl.columnValueSet(table, column)
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

            if (tableToUpdate != null) {
              state.tables[networkId][
                tableType === VisualPropertyGroup.Node
                  ? 'nodeTable'
                  : 'edgeTable'
              ] = TableImpl.duplicateColumn(tableToUpdate, columnName)
            }

            return state
          })
        },

        setTable: (networkId: IdType, tableType: TableType, table: Table) => {
          set((state) => {
            if (tableType === TableType.NODE) {
              state.tables[networkId].nodeTable = TableImpl.setTable(table)
            } else {
              state.tables[networkId].edgeTable = TableImpl.setTable(table)
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

            // Determine which rows are in which table
            const nodeRowIds: IdType[] = []
            const edgeRowIds: IdType[] = []

            rowIds.forEach((rowId) => {
              if (nodeTable?.rows.has(rowId)) {
                nodeRowIds.push(rowId)
              } else if (edgeTable?.rows.has(rowId)) {
                edgeRowIds.push(rowId)
              }
            })

            if (nodeTable != null && nodeRowIds.length > 0) {
              state.tables[networkId].nodeTable = TableImpl.deleteRows(
                nodeTable,
                nodeRowIds,
              )
            }

            if (edgeTable != null && edgeRowIds.length > 0) {
              state.tables[networkId].edgeTable = TableImpl.deleteRows(
                edgeTable,
                edgeRowIds,
              )
            }

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
        editRows: (
          networkId: IdType,
          tableType: TableType,
          rows: Map<IdType, Record<string, ValueType>>,
        ) => {
          set((state) => {
            const table =
              tableType === TableType.NODE
                ? state.tables[networkId].nodeTable
                : state.tables[networkId].edgeTable

            state.tables[networkId][
              tableType === TableType.NODE ? 'nodeTable' : 'edgeTable'
            ] = TableImpl.editRows(table, rows)

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
              logStore.info(
                `[${useTableStore.name}]: Deleted network table from db: ${networkId}`,
              )
            })
            return state
          })
        },
        deleteAll() {
          set((state) => {
            state.tables = {}
            clearTablesFromDb()
              .then(() => {
                logStore.info(
                  `[${useTableStore.name}]: Deleted all network tables from db`,
                )
              })
              .catch((err) => {
                logStore.error(
                  `[${useTableStore.name}]: Error clearing  all attribute tables from db: ${err}`,
                  err,
                )
              })

            return state
          })
        },
      })),
    ),
  ),
)
