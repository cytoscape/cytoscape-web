import { GridColumn } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { Table } from '../../../models/TableModel'
import {
  TableDisplayConfiguration,
} from '../../../models/VisualStyleModel/VisualStyleOptions'

export interface HandleColumnMoveArgs {
  startIndex: number
  endIndex: number
  allColumns: any[]
  networkId: IdType
  currentTable: Table | undefined
  nodeTable: Table | undefined
  edgeTable: Table | undefined
  tableDisplayConfiguration: TableDisplayConfiguration | undefined
  moveColumn: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    startIndex: number,
    endIndex: number,
  ) => void
  createUpdatedTableDisplayConfiguration: (
    partialConfig: any,
  ) => TableDisplayConfiguration
  setTableDisplayConfiguration: (
    networkId: IdType,
    config: TableDisplayConfiguration,
  ) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

export const handleColumnMove = ({
  startIndex,
  endIndex,
  allColumns,
  networkId,
  currentTable,
  nodeTable,
  edgeTable,
  tableDisplayConfiguration,
  moveColumn,
  createUpdatedTableDisplayConfiguration,
  setTableDisplayConfiguration,
  setNetworkModified,
}: HandleColumnMoveArgs): void => {
  // Don't allow moving virtual columns
  const startColumn = allColumns[startIndex]
  const endColumn = allColumns[endIndex]
  if ((startColumn as any)?.isVirtual || (endColumn as any)?.isVirtual) {
    return
  }

  // offset the virtual column indices
  const realColumns = allColumns.filter((col) => !(col as any).isVirtual)
  const startColId = allColumns[startIndex]?.id
  const endColId = allColumns[endIndex]?.id
  const realStartIndex = realColumns.findIndex((col) => col.id === startColId)
  const realEndIndex = realColumns.findIndex((col) => col.id === endColId)
  if (realStartIndex === -1 || realEndIndex === -1) return

  moveColumn(
    networkId,
    currentTable === nodeTable ? 'node' : 'edge',
    realStartIndex,
    realEndIndex,
  )

  // Create updated column configuration with moved column
  // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
  const defaultConfig: any = {
    columnConfiguration:
      (currentTable === nodeTable ? nodeTable : edgeTable)?.columns?.map(
        (col) => ({
          attributeName: col.name,
          visible: true,
          columnWidth: undefined,
        }),
      ) ?? [],
    sortColumn: undefined,
    sortDirection: undefined,
  }
  const currentConfig =
    currentTable === nodeTable
      ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
      : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
  
  const nextColumnConfig = [...currentConfig.columnConfiguration]
  const [movedColumn] = nextColumnConfig.splice(realStartIndex, 1)
  nextColumnConfig.splice(realEndIndex, 0, movedColumn)

  const newTableDisplayConfiguration = createUpdatedTableDisplayConfiguration({
    columnConfiguration: nextColumnConfig,
  })
  
  setTableDisplayConfiguration(networkId, newTableDisplayConfiguration)
  setNetworkModified(networkId, true)
}

export interface HandleColumnResizeArgs {
  column: GridColumn
  newSize: number
  colIndex: number
  allColumns: any[]
  networkId: IdType
  currentTable: Table | undefined
  nodeTable: Table | undefined
  edgeTable: Table | undefined
  tableDisplayConfiguration: TableDisplayConfiguration | undefined
  setColumnWidth: (
    networkId: IdType,
    tableType: 'node' | 'edge',
    columnId: string,
    width: number,
  ) => void
  createUpdatedTableDisplayConfiguration: (
    partialConfig: any,
  ) => TableDisplayConfiguration
  setTableDisplayConfiguration: (
    networkId: IdType,
    config: TableDisplayConfiguration,
  ) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

export const handleColumnResize = ({
  column,
  newSize,
  colIndex,
  allColumns,
  networkId,
  currentTable,
  nodeTable,
  edgeTable,
  tableDisplayConfiguration,
  setColumnWidth,
  createUpdatedTableDisplayConfiguration,
  setTableDisplayConfiguration,
  setNetworkModified,
}: HandleColumnResizeArgs): void => {
  if (column?.id === undefined) {
    return
  }

  // Don't allow resizing virtual columns
  const columnData = allColumns[colIndex]
  if ((columnData as any)?.isVirtual) {
    return
  }

  setColumnWidth(
    networkId,
    currentTable === nodeTable ? 'node' : 'edge',
    column.id,
    newSize,
  )

  // Update the width in the tableDisplayConfiguration
  const defaultConfig: any = {
    columnConfiguration:
      (currentTable === nodeTable ? nodeTable : edgeTable)?.columns?.map(
        (col) => ({
          attributeName: col.name,
          visible: true,
          columnWidth: undefined,
        }),
      ) ?? [],
    sortColumn: undefined,
    sortDirection: undefined,
  }
  const currentConfig =
    currentTable === nodeTable
      ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
      : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
      
  const nextColumnConfig = currentConfig.columnConfiguration.map((col: any) =>
    col.attributeName === column.id
      ? { ...col, columnWidth: newSize }
      : col,
  )

  const newTableDisplayConfiguration = createUpdatedTableDisplayConfiguration({
    columnConfiguration: nextColumnConfig,
  })
  
  setTableDisplayConfiguration(networkId, newTableDisplayConfiguration)
  setNetworkModified(networkId, true)
}
