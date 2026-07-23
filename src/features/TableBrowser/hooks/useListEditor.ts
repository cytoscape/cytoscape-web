import React from 'react'
import { Item } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { ValueType, ValueTypeName, Table } from '../../../models/TableModel'
import { isListType } from '../../../models/TableModel/impl/valueTypeImpl'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { TableColumn } from '../TableBrowser'

export interface ListEditorState {
  cxId: IdType
  columnKey: string
  columnName: string
  type: ValueTypeName
  value: ValueType | null
}

export interface UseListEditorProps {
  allColumns: TableColumn[]
  rows: any[]
  currentTable: Table | undefined
  nodeTable: Table | undefined
  currentNetworkId: IdType
  networkId: IdType
  postEdit: (type: UndoCommandType, name: string, oldVal: any, newVal: any) => void
  setCellValue: (networkId: IdType, tableType: 'node' | 'edge', elementId: string, attributeName: string, value: any) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
}

export const useListEditor = ({
  allColumns,
  rows,
  currentTable,
  nodeTable,
  currentNetworkId,
  networkId,
  postEdit,
  setCellValue,
  setNetworkModified,
}: UseListEditorProps) => {
  const [listEditor, setListEditor] = React.useState<ListEditorState | null>(null)

  const onCellActivated = React.useCallback(
    (cell: Item): void => {
      const [columnIndex, rowIndex] = cell
      const column = allColumns?.[columnIndex]
      const rowData = rows?.[rowIndex]
      if (column == null || rowData == null || (column as any).isVirtual) return
      if (!isListType(column.type)) return
      const cxId = rowData.id
      if (cxId == null) return
      setListEditor({
        cxId,
        columnKey: column.id,
        columnName: column.id,
        type: column.type,
        value: (rowData as any)?.[column.id] ?? null,
      })
    },
    [allColumns, rows],
  )

  const handleListEditorSave = React.useCallback(
    (newValue: ValueType): void => {
      if (listEditor == null) return
      const { cxId, columnKey } = listEditor
      const elementType = currentTable === nodeTable ? 'node' : 'edge'
      postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'Set cell value',
        [currentNetworkId, elementType, cxId, columnKey, listEditor.value],
        [currentNetworkId, elementType, cxId, columnKey, newValue],
      )
      setCellValue(
        currentNetworkId,
        elementType,
        `${cxId}`,
        columnKey,
        newValue,
      )
      setNetworkModified(networkId, true)
      setListEditor(null)
    },
    [
      listEditor,
      currentTable,
      nodeTable,
      postEdit,
      currentNetworkId,
      setCellValue,
      setNetworkModified,
      networkId,
    ],
  )

  return {
    listEditor,
    setListEditor,
    onCellActivated,
    handleListEditorSave,
  }
}
