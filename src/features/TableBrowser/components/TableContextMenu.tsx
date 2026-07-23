import {
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import React from 'react'

import {
  CheckBoxOutlined as CheckBoxOutlinedIcon,
  ContentCopy,
  ContentPaste,
} from '@mui/icons-material'

import { DataEditorRef, GridSelection } from '@glideapps/glide-data-grid'
import { IdType } from '../../../models/IdType'
import { Table } from '../../../models/TableModel'
import { TableColumn } from '../TableBrowser'
import { UndoCommandType } from '../../../models/StoreModel/UndoStoreModel'
import { getElementId } from '../idColumn'
import { handleApplyToEntireColumn, handleApplyToSelected, handleSelectFromSelection } from '../utils/contextMenuActions'

export interface TableContextMenuProps {
  contextMenu: {
    cell: readonly [number, number]
    anchorPosition: { top: number; left: number }
  } | null
  handleContextMenuClose: () => void
  isContextCellVirtual: boolean
  isSelectionEmpty: boolean
  currentTableIsNodeTable: boolean
  
  // Dependencies for internal actions
  activeEditorRef: React.RefObject<DataEditorRef | null>
  rows: any[]
  allColumns: TableColumn[]
  currentTable: Table | undefined
  nodeTable: Table | undefined
  currentNetworkId: IdType
  postEdit: (type: UndoCommandType, name: string, oldVal: any, newVal: any) => void
  applyValueToElements: (networkId: IdType, tableType: 'node' | 'edge', columnKey: string, value: any, elementIds?: string[]) => void
  setNetworkModified: (networkId: IdType, isModified: boolean) => void
  exclusiveSelect: (networkId: IdType, nodeIds: IdType[], edgeIds: IdType[]) => void
  selection: GridSelection
  setSelection: (selection: GridSelection) => void
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  contextMenu,
  handleContextMenuClose,
  isContextCellVirtual,
  isSelectionEmpty,
  currentTableIsNodeTable,
  activeEditorRef,
  rows,
  allColumns,
  currentTable,
  nodeTable,
  currentNetworkId,
  postEdit,
  applyValueToElements,
  setNetworkModified,
  exclusiveSelect,
  selection,
  setSelection,
}) => {
  const elementTypeName = currentTableIsNodeTable ? 'Node' : 'Edge'
  const pluralElementTypeName = currentTableIsNodeTable ? 'nodes' : 'edges'

  const onApplyToEntireColumn = React.useCallback(() => {
    if (contextMenu === null) return
    handleApplyToEntireColumn({
      contextMenuCell: contextMenu.cell,
      rows,
      allColumns,
      currentTable,
      nodeTable,
      currentNetworkId,
      postEdit,
      applyValueToElements,
      setNetworkModified: (id: string, mod: boolean) => setNetworkModified(id, mod),
      handleContextMenuClose,
    })
  }, [contextMenu, rows, allColumns, currentTable, nodeTable, currentNetworkId, postEdit, applyValueToElements, setNetworkModified, handleContextMenuClose])

  const onApplyToSelected = React.useCallback(() => {
    if (contextMenu === null) return
    handleApplyToSelected({
      contextMenuCell: contextMenu.cell,
      rows,
      allColumns,
      currentTable,
      nodeTable,
      currentNetworkId,
      postEdit,
      applyValueToElements,
      setNetworkModified: (id: string, mod: boolean) => setNetworkModified(id, mod),
      handleContextMenuClose,
    })
  }, [contextMenu, rows, allColumns, currentTable, nodeTable, currentNetworkId, postEdit, applyValueToElements, setNetworkModified, handleContextMenuClose])

  const onCopyValue = React.useCallback(() => {
    if (contextMenu === null) return
    const [columnIndex, rowIndex] = contextMenu.cell
    const rowData = rows?.[rowIndex]
    const column = allColumns?.[columnIndex]
    const columnKey = column.id
    const cellValue = (rowData as any)?.[columnKey]
    navigator.clipboard.writeText(String(cellValue ?? ''))
    handleContextMenuClose()
  }, [contextMenu, rows, allColumns, handleContextMenuClose])

  const onPaste = React.useCallback(() => {
    activeEditorRef.current?.emit('paste').catch(() => {
      console.warn('Programmatic paste blocked by browser. Please use Ctrl+V.')
    })
    handleContextMenuClose()
  }, [activeEditorRef, handleContextMenuClose])

  const onCopySelected = React.useCallback(() => {
    activeEditorRef.current?.emit('copy')
    handleContextMenuClose()
  }, [activeEditorRef, handleContextMenuClose])

  const onCopyId = React.useCallback(() => {
    if (contextMenu === null) return
    const [, rowIndex] = contextMenu.cell
    const elementId = getElementId(rows?.[rowIndex])
    if (elementId !== '') {
      navigator.clipboard.writeText(elementId)
    }
    handleContextMenuClose()
  }, [contextMenu, rows, handleContextMenuClose])

  const onSelectInViewport = React.useCallback(() => {
    if (contextMenu === null) return
    const [, rowIndex] = contextMenu.cell
    const rowData = rows?.[rowIndex]
    if (rowData?.id != null) {
      if (currentTableIsNodeTable) {
        exclusiveSelect(currentNetworkId, [rowData.id], [])
      } else {
        exclusiveSelect(currentNetworkId, [], [rowData.id])
      }
    }
    handleContextMenuClose()
  }, [contextMenu, rows, currentTableIsNodeTable, currentNetworkId, exclusiveSelect, handleContextMenuClose])

  const onSelectFromSelection = React.useCallback(() => {
    handleSelectFromSelection({
      selection,
      rows,
      currentTable,
      nodeTable,
      currentNetworkId,
      exclusiveSelect,
      setSelection,
      handleContextMenuClose,
    })
  }, [selection, rows, currentTable, nodeTable, currentNetworkId, exclusiveSelect, setSelection, handleContextMenuClose])

  return (
    <Menu
      data-testid="table-browser-context-menu"
      open={contextMenu !== null}
      onClose={handleContextMenuClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null ? contextMenu.anchorPosition : undefined
      }
      MenuListProps={{
        'aria-labelledby': 'table-browser-context-menu',
      }}
    >
      <Tooltip
        title={isContextCellVirtual ? 'Cannot apply to virtual columns' : ''}
        placement="right"
      >
        <span>
          <MenuItem
            data-testid="context-menu-apply-to-column"
            disabled={isContextCellVirtual}
            onClick={onApplyToEntireColumn}
          >
            Apply to entire column
          </MenuItem>
        </span>
      </Tooltip>

      <Tooltip
        title={isContextCellVirtual ? 'Cannot apply to virtual columns' : ''}
        placement="right"
      >
        <span>
          <MenuItem
            data-testid="context-menu-apply-to-selected"
            disabled={isContextCellVirtual}
            onClick={onApplyToSelected}
          >
            Apply to selected {pluralElementTypeName}
          </MenuItem>
        </span>
      </Tooltip>

      <Divider />

      <MenuItem data-testid="context-menu-copy" onClick={onCopyValue}>
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy</ListItemText>
      </MenuItem>

      <MenuItem data-testid="context-menu-paste" onClick={onPaste}>
        <ListItemIcon>
          <ContentPaste fontSize="small" />
        </ListItemIcon>
        <ListItemText>Paste</ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem data-testid="context-menu-copy-selected" disabled={isSelectionEmpty} onClick={onCopySelected}>
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy Selected</ListItemText>
      </MenuItem>

      <MenuItem data-testid="context-menu-copy-id" onClick={onCopyId}>
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText>Copy {elementTypeName} ID</ListItemText>
      </MenuItem>

      <Divider />

      <MenuItem data-testid="context-menu-select-viewport" onClick={onSelectInViewport}>
        Select This {elementTypeName} in Viewport
      </MenuItem>

      <MenuItem
        data-testid="context-menu-select-from-selection"
        disabled={isSelectionEmpty}
        onClick={onSelectFromSelection}
      >
        <ListItemIcon>
          <CheckBoxOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Select {pluralElementTypeName} from selection</ListItemText>
      </MenuItem>
    </Menu>
  )
}
