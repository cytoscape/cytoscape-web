import { useCallback } from 'react'

import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { logApp } from '../../../debug'
import { Table, ValueType } from '../../../models'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { ValueTypeName } from '../../../models/TableModel'
import {
  assertSameColumnType,
  columnNameIsTaken,
  DeclaredColumn,
  findColumnByName,
  mergeDeclaredColumns,
  setCellValue,
} from '../../../models/TableModel/impl/columnNames'
import { ActionHandlerProps } from './serviceResultHandlerManager'

interface UpdatedTable {
  id: TableType
  rows: Record<string, Record<string, ValueType>>
  columns: Col[]
}

interface Col {
  id: string
  type: string
}

export const useUpdateTables = (): (({
  responseObj,
  networkId,
}: ActionHandlerProps) => void) => {
  const setTable = useTableStore((state) => state.setTable)
  const isValidTableUpdate = (data: any): data is UpdatedTable => {
    return (
      data &&
      typeof data.id === 'string' &&
      (data.id === TableType.EDGE || data.id === TableType.NODE) &&
      typeof data.rows === 'object' &&
      data.rows !== null &&
      !Array.isArray(data.rows) &&
      Object.values(data.rows).every(
        (row) => typeof row === 'object' && row !== null && !Array.isArray(row),
      ) &&
      Array.isArray(data.columns) &&
      data.columns.every(
        (col: any) =>
          typeof col.id === 'string' && typeof col.type === 'string',
      )
    )
  }
  const updateTables = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      if (!isValidTableUpdate(responseObj)) {
        logApp.warn(
          `[${updateTables.name}]: Invalid table update response:`,
          responseObj,
        )
        return
      }
      const { id, rows, columns } = responseObj as UpdatedTable
      const tables = useTableStore.getState().tables[networkId]
      const originalTable: Table =
        id === TableType.NODE ? tables?.nodeTable : tables?.edgeTable

      // Columns of one name merge, ignoring case, as in Cytoscape Desktop: a
      // response column spelled like an existing column writes to it, and
      // new ones of one name share the first one's spelling and type.
      const responseColumns: DeclaredColumn[] = columns.map((c) => ({
        name: c.id,
        type: c.type as ValueTypeName,
      }))
      const columnMerge = mergeDeclaredColumns([
        ...originalTable.columns,
        ...responseColumns,
      ])
      const updatedColumns = [
        ...originalTable.columns,
        ...columnMerge.columns.filter(
          (c) => !columnNameIsTaken(originalTable.columns, c.name),
        ),
      ]
      // How a row key is declared. The response's own declaration replaces
      // the table's, since a value of this key was written with its type.
      const declaredAs = new Map<string, DeclaredColumn>(
        [...originalTable.columns, ...responseColumns].map((c) => [c.name, c]),
      )

      // Write a row's values in the order of its keys, so the last spelling
      // wins. Throws before the table is touched when a value would be
      // written to a column of another type.
      const writeValues = (
        target: Record<string, ValueType>,
        values: Record<string, ValueType>,
        keepUndeclared: boolean,
      ): void => {
        Object.entries(values).forEach(([key, value]) => {
          if (value === undefined) return
          const spelling = declaredAs.get(key)
          if (spelling === undefined) {
            if (keepUndeclared) setCellValue(target, key, value)
            return
          }
          const column = (findColumnByName(originalTable.columns, key) ??
            columnMerge.keptColumn(key)) as DeclaredColumn
          if (value !== null) assertSameColumnType(column, spelling)
          setCellValue(target, column.name, value)
        })
      }

      // update rows
      const updatedRowMap = new Map(originalTable.rows)
      Object.entries(rows).forEach(([key, newRow]) => {
        const translatedId =
          id === TableType.NODE ? key : translateElementId(key)
        const existingRow = updatedRowMap.get(translatedId as string)

        // If the row exists, update it; if not, add a new one
        const updatedRow: Record<string, ValueType> = existingRow
          ? { ...existingRow }
          : {}
        writeValues(updatedRow, newRow, existingRow === undefined)
        updatedRowMap.set(translatedId as string, updatedRow)
      })

      const nextTable: Table = {
        id: networkId,
        columns: updatedColumns, // Updated column list
        rows: updatedRowMap, // Updated row map
      }

      setTable(networkId, id, nextTable)

      // Update table display configuration so the new columns show up in TableBrowser
      const newColumnsAdded =
        updatedColumns.length > originalTable.columns.length
      if (newColumnsAdded) {
        const uiStateStore = useUiStateStore.getState()
        const currentConfig =
          uiStateStore.ui.visualStyleOptions?.[networkId]
            ?.visualEditorProperties?.tableDisplayConfiguration

        if (currentConfig) {
          const isNodeTable = id === TableType.NODE
          const tableConfigToUpdate = isNodeTable
            ? currentConfig.nodeTable
            : currentConfig.edgeTable

          if (tableConfigToUpdate) {
            const nextColumnConfig = [
              ...(tableConfigToUpdate.columnConfiguration ?? []),
            ]

            // Add any newly created columns to the display configuration
            updatedColumns.forEach((col) => {
              if (!nextColumnConfig.find((c) => c.attributeName === col.name)) {
                nextColumnConfig.push({
                  attributeName: col.name,
                  visible: true,
                  columnWidth: undefined,
                })
              }
            })

            const newTableDisplayConfiguration = {
              ...currentConfig,
              [isNodeTable ? 'nodeTable' : 'edgeTable']: {
                ...tableConfigToUpdate,
                columnConfiguration: nextColumnConfig,
              },
            }
            uiStateStore.setTableDisplayConfiguration(
              networkId,
              newTableDisplayConfiguration,
            )
          }
        }
      }
    },
    [setTable],
  )
  return updateTables
}

const translateElementId = (id: string): string => {
  if (id.startsWith('e')) {
    return id
  }
  return `e${id}`
}
