import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { useTableStore } from '../../../store/TableStore'
import { Column, ValueType, Table } from '../../../models'
import { useAppStore } from '../../../store/AppStore'

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
      if (!Array.isArray(responseObj)) return
      for (const item of responseObj) {
        const updatedTable = item as Partial<UpdatedTable>
        if (
          updatedTable &&
          typeof updatedTable.id === 'string' &&
          (updatedTable.id === TableType.EDGE ||
            updatedTable.id === TableType.NODE) &&
          typeof updatedTable.rows === 'object' &&
          Array.isArray(updatedTable.columns)
        ) {
          const { id, rows, columns } = updatedTable as UpdatedTable
          const rowMap = new Map(
            Object.entries(rows).map(([key, value]) => [
              key as string,
              value as Record<string, ValueType>,
            ]),
          )
          const nextTable: Table = {
            id: networkId,
            columns: columns.map((col) => {
              return { name: col.id, type: col.type } as Column
            }),
            rows: rowMap,
          }
          setTable(networkId, id, nextTable)
        }
      }
    },
    [],
  )
  return updateTables
}
