import { useCallback } from 'react'
import { ActionHandlerProps } from './serviceResultHandlerManager'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { useTableStore } from '../../../store/TableStore'
import { Column, ValueType,Table } from '../../../models'

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
      for (const updatedTable of responseObj) {
        const { id, rows, columns } = updatedTable as UpdatedTable
        const tableType = id.slice(0, 4)
        if (tableType === TableType.EDGE || tableType === TableType.NODE) {
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
          setTable(networkId, tableType, nextTable)
        }
      }
    },
    [],
  )
  return updateTables
}
