import '../../assets/icons.css'

import {
  CellClickedEventArgs,
  DataEditorRef,
  EditableGridCell,
  GridCell,
  GridColumn,
  Item,
} from '@glideapps/glide-data-grid'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
  IconButton,
  Tooltip,
} from '@mui/material'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import * as React from 'react'
import { useEffect, useRef } from 'react'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { useWindowSize } from '../../data/hooks/useWindowSize'
import { IdType } from '../../models/IdType'
import { Table, ValueTypeName } from '../../models/TableModel'
import {
  handleGetCellContent,
} from './utils/cellContentHandler'
import { handleCellEdit } from './utils/cellEditHandler'
import { handleColumnMove, handleColumnResize } from './utils/columnHandlers'
import { handlePaste } from './utils/pasteHandler'
import { TableContextMenu } from './components/TableContextMenu'
import { TableGrid } from './components/TableGrid'
import { Ui } from '../../models/UiModel'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { ListValueEditorDialog } from './ListValueEditorDialog'

import NetworkInfoPanel from './NetworkInfoPanel'
import { TableToolbar } from './components/TableToolbar'
import { useTableSelection } from './hooks/useTableSelection';
import { useTableData } from './hooks/useTableData';
import { useListEditor } from './hooks/useListEditor';
import { createHeaderIcons, handleDrawHeader } from './utils/tableRenderers';
import { TabPanel } from './components/TabPanel'
import { TableBrowserTabs } from './components/TableBrowserTabs'
import { useTableMinMaxIds } from './hooks/useTableMinMaxIds'
import { useTableScrollToTop } from './hooks/useTableScrollToTop'
import { useIsContextCellVirtual } from './hooks/useIsContextCellVirtual'
import { useDataEditorTheme } from './hooks/useDataEditorTheme'

export interface TableColumn {
  id: string
  title: string
  type: ValueTypeName
  index: number
  width?: number
}

const EMPTY_ARRAY: IdType[] = []

// Used for calculating proper height for the Data Grid
const TABS_HEIGHT = 32
const TOOLBAR_HEIGHT = 36

// Adjust Data Grid size
const GRID_GAP = TABS_HEIGHT + TOOLBAR_HEIGHT + 15


export default function TableBrowser(props: {
  currentNetworkId: IdType
  setHeight: (height: number) => void
  height: number // current height of the panel that contains the table browser -- needed to sync to the dataeditor
}): React.ReactElement {
  const { width } = useWindowSize()
  const { postEdit } = useUndoStack()
  const ui: Ui = useUiStateStore((state) => state.ui)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const headerIcons = React.useMemo(() => createHeaderIcons(isDark), [isDark])
  
  
  const setUi = useUiStateStore((state) => state.setUi)
  const currentTabIndex = ui.tableUi.activeTabIndex

  const networkModified = useWorkspaceStore(
    (state) => state.workspace.networkModified,
  )
  const networkModifiedRef = useRef(networkModified)

  // Update the ref when networkModified changes
  useEffect(() => {
    networkModifiedRef.current = networkModified
  }, [networkModified])

  const setCurrentTabIndex = (index: number): void => {
    const nextTableUi = { ...ui.tableUi, activeTabIndex: index }

    const nextUi = { ...ui, tableUi: nextTableUi }
    setUi(nextUi)
  }

  const setColumnWidth = useUiStateStore((state) => state.setColumnWidth)

  const [contextMenu, setContextMenu] = React.useState<{
    anchorPosition: { top: number; left: number }
    cell: Item
  } | null>(null)

  const handleContextMenuClose = React.useCallback(() => {
    setContextMenu(null)
  }, [])

  const {
    selection,
    setSelection,
    onGridSelectionChange,
  } = useTableSelection({ currentTabIndex })

  const nodeDataEditorRef = React.useRef<DataEditorRef>(null)
  const edgeDataEditorRef = React.useRef<DataEditorRef>(null)


  const networkId = props.currentNetworkId
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[props.currentNetworkId],
  )
  const setMapping = useVisualStyleStore((state) => state.setMapping)

  const selectedNodes = useViewModelStore(
    (state) => state.getViewModel(networkId)?.selectedNodes ?? EMPTY_ARRAY
  )
  const selectedEdges = useViewModelStore(
    (state) => state.getViewModel(networkId)?.selectedEdges ?? EMPTY_ARRAY
  )

  const tableDisplayConfiguration = useUiStateStore(
    (state) =>
      state.ui.visualStyleOptions?.[networkId]?.visualEditorProperties
        ?.tableDisplayConfiguration,
  )

  const setTableDisplayConfiguration = useUiStateStore(
    (state) => state.setTableDisplayConfiguration,
  )

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setCellValue = useTableStore((state) => state.setValue)
  const setValues = useTableStore((state) => state.setValues)
  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const duplicateColumn = useTableStore((state) => state.duplicateColumn)
  const setColumnName = useTableStore((state) => state.setColumnName)
  const addColumn = useTableStore((state) => state.createColumn)
  const deleteColumn = useTableStore((state) => state.deleteColumn)
  const applyValueToElemenets = useTableStore(
    (state) => state.applyValueToElements,
  )
  const moveColumn = useTableStore((state) => state.moveColumn)

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  // TODO reenable this when we figure out why this sometimes blocks the UI when switching to/from a hcx network
  // set the network to 'modified' when the table data is modified
  // useTableStore.subscribe(
  //   (state) => state.tables[networkId],
  //   (next: TableRecord, prev: TableRecord) => {
  //     if (prev === undefined || next === undefined) {
  //       return
  //     }

  //     console.log('Table data changed', prev, next)
  //     // Check if any table data has changed (excluding the selected rows/columns)
  //     const tableDataChanged =
  //       !_.isEqual(prev.nodeTable, next.nodeTable) ||
  //       !_.isEqual(prev.edgeTable, next.edgeTable)

  //     const { networkModified } = workspace

  //     const currentNetworkIsNotModified =
  //       networkModified[networkId] === undefined ||
  //       networkModified[networkId] === false

  //     // If table data changed and the network is not already marked as modified, set it to modified
  //     if (tableDataChanged && currentNetworkIsNotModified) {
  //       setNetworkModified(networkId, true)
  //     }
  //   },
  // )

  const nodeTable = tables[networkId]?.nodeTable
  const edgeTable = tables[networkId]?.edgeTable
  const network = useNetworkStore((state) => state.networks.get(networkId))

  const { minNodeId, maxNodeId, minEdgeId, maxEdgeId } = useTableMinMaxIds(
    nodeTable,
    edgeTable,
  )

  // Temporary fix: fallback to table columns if tableDisplayConfiguration is not found
  // Memoized so downstream memos (columns/allColumns) keep stable identities
  const {
    currentTable,
    setSort,
    allColumns,
    columns,
    rows,
    selectedElements,
    createUpdatedTableDisplayConfiguration,
  } = useTableData({
    currentTabIndex,
    nodeTable,
    edgeTable,
    network,
    tableDisplayConfiguration,
    selectedNodes,
    selectedEdges,
  })


  

  useTableScrollToTop(nodeDataEditorRef, edgeDataEditorRef, selectedElements)

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getContent = React.useCallback(
    (cell: Item): GridCell => {
      return handleGetCellContent({ cell, rows, allColumns })
    },
    [rows, allColumns],
  )


  const {
    listEditor,
    setListEditor,
    onCellActivated,
    handleListEditorSave,
  } = useListEditor({
    allColumns,
    rows,
    currentTable,
    nodeTable,
    currentNetworkId: props.currentNetworkId,
    networkId,
    postEdit,
    setCellValue,
    setNetworkModified,
  })

  const onColMoved = React.useCallback(
    (startIndex: number, endIndex: number): void => {
      handleColumnMove({
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
        setNetworkModified: (id, modified) => setNetworkModified(id, modified),
      })
    },
    [
      allColumns,
      createUpdatedTableDisplayConfiguration,
      currentTable,
      nodeTable,
      edgeTable,
      moveColumn,
      networkId,
      setTableDisplayConfiguration,
      setNetworkModified,
      tableDisplayConfiguration,
    ],
  )

  const onItemHovered = React.useCallback(
    (cell: Item) => {
      const rowIndex = cell[1]
      const rowData = rows[rowIndex]
      const cxId = rowData?.id

      if (cxId != null) {
        // TODO this operation is too expensive for large networks
        // // const eleId = isNodeTable ? `${cxId}` : translateCXEdgeId(`${cxId}`)
        // setHovered(networkId, String(cxId))
      }
    },
    [rows],
  )

  const onColumnResize = React.useCallback(
    (column: GridColumn, newSize: number, colIndex: number): void => {
      handleColumnResize({
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
        setNetworkModified: (id, modified) => setNetworkModified(id, modified),
      })
    },
    [
      allColumns,
      createUpdatedTableDisplayConfiguration,
      currentTable,
      nodeTable,
      edgeTable,
      setColumnWidth,
      setTableDisplayConfiguration,
      setNetworkModified,
      networkId,
      tableDisplayConfiguration,
    ],
  )

  const onCellContextMenu = React.useCallback(
    (cell: Item, event: CellClickedEventArgs): void => {
      event.preventDefault()
      setContextMenu({
        anchorPosition: {
          top: event.bounds.y + event.bounds.height,
          left: event.bounds.x + event.localEventX,
        },
        cell,
      })
    },
    [],
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      handleCellEdit({
        cell,
        newValue,
        rows,
        allColumns,
        currentTable,
        nodeTable,
        currentNetworkId: props.currentNetworkId,
        postEdit,
        setCellValue,
        setNetworkModified: (id, modified) => setNetworkModified(id, modified),
      })
    },
    [
      props.currentNetworkId,
      currentTable,
      rows,
      allColumns,
      postEdit,
      setNetworkModified,
      nodeTable,
      setCellValue,
    ],
  )


  const onPaste = React.useCallback(
    (target: Item, values: readonly (readonly string[])[]) => {
      return handlePaste({
        target,
        values,
        rows,
        allColumns,
        currentNetworkId: props.currentNetworkId,
        currentTable,
        nodeTable,
        postEdit,
        setValues,
        setNetworkModified: (id, modified) => setNetworkModified(id, modified),
      })
    },
    [
      rows,
      allColumns,
      props.currentNetworkId,
      currentTable,
      nodeTable,
      postEdit,
      setValues,
      setNetworkModified,

    ],
  )

  const selectedColumn =
    selection.columns.length > 0 ? allColumns[selection.columns.first()!] : null



  // scan the visual properties to see if the selected column name is used in any mappings
  const visualPropertiesDependentOnSelectedColumn = React.useMemo(() => {
    return Object.values(visualStyle ?? {}).filter(
      (vpValue) =>
        selectedColumn?.id != null &&
        vpValue?.mapping?.attribute === selectedColumn.id,
    )
  }, [visualStyle, selectedColumn?.id])
  const tableBrowserToolbar = (
    <TableToolbar
      currentNetworkId={props.currentNetworkId}
      currentTable={currentTable}
      nodeTable={nodeTable}
      edgeTable={edgeTable}
      tables={tables}
      selection={selection}
      setSelection={setSelection}
      rows={rows}
      allColumns={allColumns}
      tableDisplayConfiguration={tableDisplayConfiguration}
      createUpdatedTableDisplayConfiguration={createUpdatedTableDisplayConfiguration}
      setTableDisplayConfiguration={setTableDisplayConfiguration}
      setNetworkModified={setNetworkModified}
      postEdit={postEdit}
      addColumn={addColumn}
      deleteColumn={deleteColumn}
      setColumnName={setColumnName}
      applyValueToElements={applyValueToElemenets}
      exclusiveSelect={exclusiveSelect}
      visualPropertiesDependentOnSelectedColumn={visualPropertiesDependentOnSelectedColumn}
      setMapping={setMapping}
      setSort={setSort}
      duplicateColumn={duplicateColumn}
      columns={columns}
    />
  )

  const isContextCellVirtual = useIsContextCellVirtual(contextMenu, allColumns)

  const dataEditorTheme = useDataEditorTheme()

  return (
    <Box
      data-testid="table-browser"
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'clip',
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: (theme) => theme.palette.background.subtle,
        }}
      >
        <TableBrowserTabs
          currentTabIndex={currentTabIndex}
          handleChange={handleChange}
          selectedNodesCount={selectedNodes.length}
          selectedEdgesCount={selectedEdges.length}
          tabsHeight={TABS_HEIGHT}
        />
        <Tooltip title="Close panel">
          <IconButton
            data-testid="network-browser-panel-close-button"
            sx={{
              width: 32,
              height: 32,
              mr: 1,
              color: (theme) => theme.palette.text.secondary,
              '&:hover': {
                color: (theme) => theme.palette.text.primary,
                backgroundColor: 'transparent',
              },
            }}
            onClick={() => {
              setPanelState(Panel.BOTTOM, PanelState.CLOSED)
              props.setHeight(0)
            }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <TabPanel value={currentTabIndex} index={0}>
        {tableBrowserToolbar}
        <TableGrid
          testId="table-browser-node-editor"
          editorRef={nodeDataEditorRef}
          selection={selection}
          onGridSelectionChange={onGridSelectionChange}
          minId={minNodeId ?? 0}
          maxId={maxNodeId ?? 0}
          onCellContextMenu={onCellContextMenu}
          onCellActivated={onCellActivated}
          onPaste={onPaste}
          onColumnMoved={onColMoved}
          onItemHovered={onItemHovered}
          onColumnResizeEnd={onColumnResize}
          width={width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={allColumns}
          theme={dataEditorTheme}
          headerIcons={headerIcons}
          drawHeader={handleDrawHeader}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        {tableBrowserToolbar}
        <TableGrid
          testId="table-browser-edge-editor"
          editorRef={edgeDataEditorRef}
          selection={selection}
          onGridSelectionChange={onGridSelectionChange}
          minId={minEdgeId ?? 0}
          maxId={maxEdgeId ?? 0}
          onCellContextMenu={onCellContextMenu}
          onCellActivated={onCellActivated}
          onPaste={onPaste}
          onColumnMoved={onColMoved}
          onItemHovered={onItemHovered}
          onColumnResizeEnd={onColumnResize}
          width={width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={allColumns}
          theme={dataEditorTheme}
          headerIcons={headerIcons}
          drawHeader={handleDrawHeader}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={2}>
        <NetworkInfoPanel height={props.height - TOOLBAR_HEIGHT - 1} />
      </TabPanel>
      <TableContextMenu
        contextMenu={contextMenu}
        handleContextMenuClose={handleContextMenuClose}
        isContextCellVirtual={isContextCellVirtual}
        isSelectionEmpty={
          selection.rows.length === 0 && selection.current === undefined
        }
        currentTableIsNodeTable={currentTable === nodeTable}
        activeEditorRef={currentTable === nodeTable ? nodeDataEditorRef : edgeDataEditorRef}
        rows={rows}
        allColumns={allColumns}
        currentTable={currentTable}
        nodeTable={nodeTable}
        currentNetworkId={props.currentNetworkId}
        postEdit={postEdit}
        applyValueToElements={applyValueToElemenets}
        setNetworkModified={(id, mod) => setNetworkModified(id, mod)}
        exclusiveSelect={exclusiveSelect}
        selection={selection}
        setSelection={setSelection}
      />
      {listEditor !== null ? (
        <ListValueEditorDialog
          key={`${listEditor.cxId}:${listEditor.columnKey}`}
          open={true}
          columnName={listEditor.columnName}
          listType={listEditor.type}
          value={listEditor.value}
          onCancel={() => setListEditor(null)}
          onSave={handleListEditorSave}
        />
      ) : null}
    </Box>
  )
}
