import { useCallback } from 'react'

import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { logApp } from '../../../debug'
import { Column, Table, ValueType } from '../../../models'
import { TableType } from '../../../models/StoreModel/TableStoreModel'
import { TableDisplayConfiguration } from '../../../models/VisualStyleModel/VisualStyleOptions'
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
  const setTableDisplayConfiguration = useUiStateStore(
    (state) => state.setTableDisplayConfiguration,
  )
  const isValidTableUpdate = (data: any): data is UpdatedTable => {
    return (
      data &&
      typeof data.id === 'string' &&
      (data.id === TableType.EDGE || data.id === TableType.NODE) &&
      typeof data.rows === 'object' &&
      !Array.isArray(data.rows) &&
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
        const translatedId =
          id === TableType.NODE ? key : translateElementId(key)
        const existingRow = updatedRowMap.get(translatedId as string)

        // If the row exists, update it; if not, add a new one
        if (existingRow) {
          const updatedRow = { ...existingRow }
          updatedColumns.forEach((col) => {
            if (newRow[col.name] !== undefined) {
              updatedRow[col.name] = newRow[col.name]
            }
          })
          updatedRowMap.set(translatedId as string, updatedRow)
        } else {
          // New row, add it
          updatedRowMap.set(translatedId as string, newRow)
        }
      })

      const nextTable: Table = {
        id: networkId,
        columns: updatedColumns, // Updated column list
        rows: updatedRowMap, // Updated row map
      }

      setTable(networkId, id, nextTable)

      // The Table Browser renders columns from tableDisplayConfiguration,
      // not from the table model, so new columns must be registered there
      // as well or they stay invisible (GH issue #569)
      const tdc: TableDisplayConfiguration | undefined =
        useUiStateStore.getState().ui.visualStyleOptions?.[networkId]
          ?.visualEditorProperties?.tableDisplayConfiguration
      if (tdc !== undefined) {
        const configKey = id === TableType.NODE ? 'nodeTable' : 'edgeTable'
        const existingNames = new Set(
          tdc[configKey].columnConfiguration.map((c) => c.attributeName),
        )
        const newColumnConfigs = columns
          .filter((col) => !existingNames.has(col.id))
          .map((col) => ({
            attributeName: col.id,
            visible: true,
            columnWidth: undefined,
          }))
        if (newColumnConfigs.length > 0) {
          setTableDisplayConfiguration(networkId, {
            ...tdc,
            [configKey]: {
              ...tdc[configKey],
              columnConfiguration: [
                ...tdc[configKey].columnConfiguration,
                ...newColumnConfigs,
              ],
            },
          })
        }
      }
    },
    [setTable, setTableDisplayConfiguration],
  )
  return updateTables
}

const translateElementId = (id: string): string => {
  if (id.startsWith('e')) {
    return id
  }
  return `e${id}`
}
