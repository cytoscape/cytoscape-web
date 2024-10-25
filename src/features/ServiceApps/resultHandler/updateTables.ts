import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { useTableStore } from '../../../store/TableStore'
import { Column, ValueType, Table } from '../../../models'

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
  const updateTables = useCallback(
    ({ responseObj, networkId }: ActionHandlerProps) => {
      const updatedTable = responseObj as Partial<UpdatedTable>
      if (
        updatedTable &&
        typeof updatedTable.id === 'string' &&
        (updatedTable.id === TableType.EDGE ||
          updatedTable.id === TableType.NODE) &&
        typeof updatedTable.rows === 'object' &&
        Array.isArray(updatedTable.columns)
      ) {
        const { id, rows, columns } = updatedTable as UpdatedTable
        const tables = useTableStore.getState().tables[networkId]
        const originalTable: Table =
          id === TableType.NODE ? tables?.nodeTable : tables?.edgeTable

        const originalColumnSet = new Set(
          originalTable.columns.map((col) => `${col.name}|${col.type}`),
        )

        // update columns
        const updatedColumns = [...originalTable.columns]
        columns.forEach((newCol) => {
          const columnSignature = `${newCol.id}|${newCol.type}`
          if (!originalColumnSet.has(columnSignature)) {
            updatedColumns.push({
              name: newCol.id,
              type: newCol.type,
            } as Column)
          }
        })

        // update rows
        const updatedRowMap = new Map(originalTable.rows)
        Object.entries(rows).forEach(([key, newRow]) => {
          const existingRow = updatedRowMap.get(key as string)

          // If the row exists, update it; if not, add a new one
          if (existingRow) {
            const updatedRow = { ...existingRow };
            updatedColumns.forEach((col) => {
              if (newRow[col.name] !== undefined) {
                updatedRow[col.name] = newRow[col.name]
              }
            })
            updatedRowMap.set(key as string, updatedRow)
          } else {
            // New row, add it
            updatedRowMap.set(key as string, newRow)
          }
        })

        const nextTable: Table = {
          id: networkId,
          columns: updatedColumns, // Updated column list
          rows: updatedRowMap, // Updated row map
        }

        setTable(networkId, id, nextTable)
      }
    },
    [setTable],
  )
  return updateTables
}
