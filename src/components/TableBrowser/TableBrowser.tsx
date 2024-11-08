import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material'
import { Button, ButtonGroup, Tooltip } from '@mui/material'
import _, { set } from 'lodash'
import '../../assets/icons.css'
import {
  SortAscIcon,
  SortDescIcon,
  RenameIcon,
  DuplicateIcon,
  EditIcon,
} from './Icon'
import {
  Table,
  ValueType,
  ValueTypeName,
  Column,
} from '../../models/TableModel'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { IdType } from '../../models/IdType'
import { useVisualStyleStore } from '../../store/VisualStyleStore'

import { isValidUrl } from '../../utils/is-url'
import {
  EditTableColumnForm,
  CreateTableColumnForm,
  DeleteTableColumnForm,
} from './TableColumnForm'

import {
  DataEditor,
  GridCellKind,
  GridCell,
  EditableGridCell,
  Item,
  CellClickedEventArgs,
  DataEditorRef,
  HeaderClickedEventArgs,
  GridColumn,
  GridSelection,
  CompactSelection,
} from '@glideapps/glide-data-grid'

import {
  deserializeValueList,
  valueDisplay,
  isListType,
  SortType,
  serializedStringIsValid,
  deserializeValue,
} from '../../models/TableModel/impl/ValueTypeImpl'
import { serializeColumnUIKey, useUiStateStore } from '../../store/UiStateStore'
import { PanelState } from '../../models/UiModel/PanelState'
import { Panel } from '../../models/UiModel/Panel'
import { Ui } from '../../models/UiModel'
import NetworkInfoPanel from './NetworkInfoPanel'
import { NetworkView } from '../../models/ViewModel'
import { useJoinTableToNetworkStore } from '../../features/TableDataLoader/store/joinTableToNetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { TableRecord } from '../../models/StoreModel/TableStoreModel'
import { useEffect, useRef } from 'react'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export interface TableColumn {
  id: string
  title: string
  type: ValueTypeName
  index: number
  width?: number
}

// Used for calculating proper height for the Data Grid
const TOOLBAR_HEIGHT = 36
const TABS_HEIGHT = 32

// Adjust Data Grid size
const GRID_GAP = TOOLBAR_HEIGHT * 2 - 1

function TabPanel(props: TabPanelProps): React.ReactElement {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ flexGrow: 1 }}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

export const getCellKind = (type: ValueTypeName): GridCellKind => {
  const valueTypeName2CellTypeMap: Record<ValueTypeName, GridCellKind> = {
    [ValueTypeName.String]: GridCellKind.Text,
    [ValueTypeName.Long]: GridCellKind.Number,
    [ValueTypeName.Integer]: GridCellKind.Number,
    [ValueTypeName.Double]: GridCellKind.Number,
    [ValueTypeName.Boolean]: GridCellKind.Boolean,
    [ValueTypeName.ListString]: GridCellKind.Text,
    [ValueTypeName.ListLong]: GridCellKind.Text,
    [ValueTypeName.ListInteger]: GridCellKind.Text,
    [ValueTypeName.ListDouble]: GridCellKind.Text,
    [ValueTypeName.ListBoolean]: GridCellKind.Text,
  }
  return valueTypeName2CellTypeMap[type] ?? GridCellKind.Text
}

export default function TableBrowser(props: {
  currentNetworkId: IdType
  setHeight: (height: number) => void
  height: number // current height of the panel that contains the table browser -- needed to sync to the dataeditor
  width: number // current width of the panel that contains the table browser -- needed to sync to the dataeditor
}): React.ReactElement {
  const ui: Ui = useUiStateStore((state) => state.ui)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)
  const { panels } = ui
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

  const showTableJoinForm = useJoinTableToNetworkStore((state) => state.setShow)

  const setColumnWidth = useUiStateStore((state) => state.setColumnWidth)

  const [showCreateColumnForm, setShowCreateColumnForm] = React.useState(false)
  const [createColumnFormError, setCreateColumnFormError] = React.useState<
    string | undefined
  >(undefined)

  const [showDeleteColumnForm, setShowDeleteColumnForm] = React.useState(false)
  const [deleteColumnFormError, setDeleteColumnFormError] = React.useState<
    string | undefined
  >(undefined)

  const [showEditColumnForm, setShowEditColumnForm] = React.useState(false)
  const [columnFormError, setColumnFormError] = React.useState<
    string | undefined
  >(undefined)

  const [nodeSelection, setNodeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })

  const [edgeSelection, setEdgeSelection] = React.useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  })

  const selection = currentTabIndex === 0 ? nodeSelection : edgeSelection
  const setSelection =
    currentTabIndex === 0 ? setNodeSelection : setEdgeSelection

  const [selectedCellColumn, setSelectedCellColumn] = React.useState<
    number | null
  >(null)

  const nodeDataEditorRef = React.useRef<DataEditorRef>(null)
  const edgeDataEditorRef = React.useRef<DataEditorRef>(null)

  const [showSearch, setShowSearch] = React.useState(false)
  const onSearchClose = React.useCallback(() => setShowSearch(false), [])
  const [sort, setSort] = React.useState<SortType>({
    column: undefined,
    direction: undefined,
    valueType: undefined,
  })

  const networkId = props.currentNetworkId
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[props.currentNetworkId],
  )
  const setMapping = useVisualStyleStore((state) => state.setMapping)

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(networkId),
  )
  const selectedNodes = useViewModelStore(
    (state) => viewModel?.selectedNodes ?? [],
  )
  const selectedEdges = useViewModelStore(
    (state) => viewModel?.selectedEdges ?? [],
  )

  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const setCellValue = useTableStore((state) => state.setValue)
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

  const workspace = useWorkspaceStore((state) => state.workspace)
  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  // set the network to 'modified' when the table data is modified
  useTableStore.subscribe(
    (state) => state.tables[networkId],
    (prev: TableRecord, next: TableRecord) => {
      if (prev === undefined || next === undefined) {
        return
      }

      // Check if any table data has changed (excluding the selected rows/columns)
      const tableDataChanged =
        !_.isEqual(prev.nodeTable, next.nodeTable) ||
        !_.isEqual(prev.edgeTable, next.edgeTable)

      const { networkModified } = workspace

      const currentNetworkIsNotModified =
        networkModified[networkId] === undefined ||
        networkModified[networkId] === false

      // If table data changed and the network is not already marked as modified, set it to modified
      if (tableDataChanged && currentNetworkIsNotModified) {
        setNetworkModified(networkId, true)
      }
    },
  )

  const nodeTable = tables[networkId]?.nodeTable
  const edgeTable = tables[networkId]?.edgeTable
  const currentTable = currentTabIndex === 0 ? nodeTable : edgeTable
  const nodeIds = Array.from(nodeTable?.rows.keys() ?? new Map()).map((v) => +v)
  const edgeIds = Array.from(edgeTable?.rows.keys() ?? new Map()).map(
    (v) => +v.slice(1),
  )
  const maxNodeId = nodeIds.sort((a, b) => b - a)[0]
  const minNodeId = nodeIds.sort((a, b) => a - b)[0]
  const maxEdgeId = edgeIds.sort((a, b) => b - a)[0]
  const minEdgeId = edgeIds.sort((a, b) => a - b)[0]
  const modelColumns: Column[] =
    currentTable?.columns != null ? currentTable?.columns : []

  const columnWidths = ui.tableUi.columnUiState

  const columns = modelColumns.map((col, index) => {
    const tableTypeStr = currentTable === nodeTable ? 'node' : 'edge'
    const columnWidthKey = serializeColumnUIKey(
      networkId,
      tableTypeStr,
      col.name,
    )
    return {
      id: col.name,
      title: col.name,
      type: col.type,
      index,
      width: columnWidths?.[columnWidthKey]?.width,
    }
  })

  const selectedElements = currentTabIndex === 0 ? selectedNodes : selectedEdges
  const selectedElementsSet = new Set(selectedElements)
  const rowsWithIds = Array.from(
    (currentTable?.rows ?? new Map()).entries(),
  ).map(([key, value]) => ({ ...value, id: key }))
  let rows =
    selectedElements?.length > 0
      ? rowsWithIds.filter((r) => selectedElementsSet.has(r.id))
      : rowsWithIds

  React.useEffect(() => {
    // scroll to the first result anytime someone changes the filtered rows
    // e.g. when the user selects nodes in the network view, scroll to the top of the list in the table
    nodeDataEditorRef.current?.scrollTo(0, 0, 'both', 0, 0, {
      vAlign: 'start',
      hAlign: 'start',
    })
    edgeDataEditorRef.current?.scrollTo(0, 0, 'both', 0, 0, {
      vAlign: 'start',
      hAlign: 'start',
    })
  }, [selectedElements])

  if (sort.column != null && sort.direction != null && sort.valueType != null) {
    if (sort.column != null) {
      rows = _.orderBy(
        rows,
        (o) =>
          (o as Record<string, ValueType>)[sort.column as string] as ValueType,
        sort.direction,
      )
    }
  }

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getContent = React.useCallback(
    (cell: Item): GridCell => {
      const [columnIndex, rowIndex] = cell
      const dataRow = rows?.[rowIndex]
      const column = columns?.[columnIndex]
      const columnKey = column?.id
      const cellValue = (dataRow as any)?.[columnKey]
      if (dataRow == null || cellValue == null || column == null) {
        return {
          allowOverlay: true,
          readonly: false,
          kind: GridCellKind.Text,
          displayData: '',
          data: '',
        }
      }

      const cellType = getCellKind(column.type)
      const processedCellValue = valueDisplay(cellValue, column.type)

      if (cellType === GridCellKind.Boolean) {
        return {
          allowOverlay: false,
          kind: cellType,
          readonly: false,
          data: processedCellValue as boolean,
        }
      } else if (cellType === GridCellKind.Number) {
        return {
          allowOverlay: true,
          kind: cellType,
          readonly: false,
          displayData: String(processedCellValue),
          data: processedCellValue as number,
        }
      } else {
        if (isValidUrl(String(processedCellValue))) {
          return {
            kind: GridCellKind.Uri,
            allowOverlay: true,
            readonly: false,
            data: processedCellValue as string,
          }
        }
        return {
          kind: GridCellKind.Text,
          allowOverlay: true,
          displayData: String(processedCellValue),
          readonly: false,
          data: processedCellValue as string,
        }
      }
    },
    [props.currentNetworkId, rows, currentTable, tables, sort, currentTabIndex],
  )

  const onColMoved = React.useCallback(
    (startIndex: number, endIndex: number): void => {
      moveColumn(
        networkId,
        currentTable === nodeTable ? 'node' : 'edge',
        startIndex,
        endIndex,
      )
    },
    [modelColumns],
  )

  const onItemHovered = React.useCallback(
    (cell: Item) => {
      const rowIndex = cell[1]
      const rowData = rows[rowIndex]
      const cxId = rowData?.id

      if (cxId != null) {
        // TODO this operation is too expensive for large networks
        // // const eleId = isNodeTable ? `${cxId}` : translateCXEdgeId(`${cxId}`)
        // setHovered(props.currentNetworkId, String(cxId))
      }
    },
    [props.currentNetworkId, currentTable, tables],
  )

  const onColumnResize = React.useCallback(
    (
      column: GridColumn,
      newSize: number,
      colIndex: number,
      newSizeWithGrow: number,
    ): void => {
      if (column?.id !== undefined) {
        setColumnWidth(
          networkId,
          currentTable === nodeTable ? 'node' : 'edge',
          column.id,
          newSize,
        )
      }
    },
    [columns, columnWidths],
  )

  const onCellContextMenu = React.useCallback(
    (cell: Item, event: CellClickedEventArgs): void => {
      event.preventDefault()
    },
    [props.currentNetworkId, currentTable, tables],
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [columnIndex, rowIndex] = cell
      const rowData = rows?.[rowIndex]
      const cxId = rowData?.id
      const column = columns?.[columnIndex]
      const columnKey = column.id
      let data = newValue.data

      if (rowData == null || cxId == null || column == null || data == null)
        return

      if (isListType(column.type)) {
        data = deserializeValueList(column.type, data as string)
      }

      const newDataIsValid = true

      // TODO validate the new data
      if (newDataIsValid) {
        setCellValue(
          props.currentNetworkId,
          currentTable === nodeTable ? 'node' : 'edge',
          `${cxId}`,
          columnKey,
          data as ValueType,
        )
      } else {
        // dont edit the value or do something else
      }
    },
    [props.currentNetworkId, currentTable, tables, sort, rows],
  )

  const onHeaderClicked = React.useCallback(
    (col: number, event: HeaderClickedEventArgs): void => {
      setSelection({
        ...selection,
        columns: CompactSelection.fromSingleSelection(col),
      })
    },
    [selection],
  )

  const onCellClicked = React.useCallback(
    (cell: Item, event: CellClickedEventArgs): void => {
      const rowIndex = cell[1]
      const columnIndex = cell[0]

      if (event.shiftKey) {
        // Handle shift-click for range selection
        const start = Math.min(selection.rows.first() ?? 0, rowIndex)
        const end = Math.max(selection.rows.last() ?? 0, rowIndex)
        setSelection({
          ...selection,
          rows: CompactSelection.fromSingleSelection(start).add([
            start,
            end + 1,
          ]),
        })
      } else if (event.ctrlKey || event.metaKey) {
        // Handle ctrl/cmd-click for toggle selection
        const newRows = selection.rows.hasIndex(rowIndex)
          ? selection.rows.remove(rowIndex)
          : selection.rows.add(rowIndex)
        setSelection({
          ...selection,
          rows: newRows,
        })
      } else {
        // Handle single row selection
        setSelection({
          rows: CompactSelection.fromSingleSelection(cell[1]),
          columns: CompactSelection.empty(),
          current: {
            cell,
            range: {
              x: cell[0],
              y: cell[1],
              width: 1,
              height: 1,
            },
            rangeStack: [],
          },
        })
      }

      setSelectedCellColumn(columnIndex)
    },
    [selection],
  )

  const selectedColumn =
    selection.columns.length > 0 ? columns[selection.columns.first()!] : null

  // scan the visual properties to see if the selected column name is used in any mappings
  const visualPropertiesDependentOnSelectedColumn = Object.values(
    visualStyle ?? {},
  ).filter(
    (vpValue) =>
      selectedColumn?.id != null &&
      vpValue?.mapping?.attribute === selectedColumn.id,
  )
  const selectedColumnToolbar =
    selectedColumn != null ? (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            bgColor: '#d9d9d9',
          }}
        >
          <Tooltip
            title="Sort Ascending"
            placement="bottom"
            PopperProps={{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -24],
                  },
                },
              ],
            }}
          >
            <Button
              sx={{ mr: 1 }}
              onClick={() => {
                if (selectedColumn != null) {
                  const columnKey = selectedColumn.id
                  const columnType = selectedColumn.type

                  setSort({
                    column: columnKey,
                    direction: 'asc',
                    valueType: columnType,
                  })
                }
              }}
            >
              <SortAscIcon />
            </Button>
          </Tooltip>
          <Tooltip
            title="Sort Descending"
            placement="bottom"
            PopperProps={{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -24],
                  },
                },
              ],
            }}
          >
            <Button
              sx={{ mr: 1 }}
              onClick={() => {
                if (selectedColumn != null) {
                  const columnKey = selectedColumn.id
                  const columnType = selectedColumn.type
                  setSort({
                    column: columnKey,
                    direction: 'desc',
                    valueType: columnType,
                  })
                }
              }}
            >
              <SortDescIcon />
            </Button>
          </Tooltip>
          <Tooltip
            title="Duplicate column"
            placement="bottom"
            PopperProps={{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -24],
                  },
                },
              ],
            }}
          >
            <Button
              sx={{ mr: 1 }}
              onClick={() => {
                if (selectedColumn !== null) {
                  const columnKey = selectedColumn.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                  setSelection({
                    ...selection,
                    columns: CompactSelection.fromSingleSelection(
                      selectedColumn.index + 1, // select the newly created column
                    ),
                  })
                }
              }}
            >
              <DuplicateIcon />
            </Button>
          </Tooltip>
          <Tooltip
            title="Rename column"
            placement="bottom"
            PopperProps={{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -24],
                  },
                },
              ],
            }}
          >
            <Button sx={{ mr: 1 }} onClick={() => setShowEditColumnForm(true)}>
              <EditIcon />
            </Button>
          </Tooltip>
          <Tooltip
            title="Delete column"
            placement="bottom"
            PopperProps={{
              modifiers: [
                {
                  name: 'offset',
                  options: {
                    offset: [0, -24],
                  },
                },
              ],
            }}
          >
            <Button
              color="error"
              onClick={() => {
                setShowDeleteColumnForm(true)
              }}
            >
              <span className="icon">&#46;</span>
            </Button>
          </Tooltip>
        </Box>
        <EditTableColumnForm
          error={columnFormError}
          dependentVisualProperties={visualPropertiesDependentOnSelectedColumn}
          open={showEditColumnForm}
          column={selectedColumn}
          onClose={() => {
            setShowEditColumnForm(false)
            setColumnFormError(undefined)
          }}
          onSubmit={(newColumnName: string, mappingUpdateType) => {
            const columnNameSet = new Set(columns?.map((c) => c.id))
            if (columnNameSet.has(newColumnName)) {
              setColumnFormError(
                `${newColumnName} already exists.  Please enter a new unique column name`,
              )
            } else {
              setColumnName(
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                selectedColumn.id,
                newColumnName,
              )

              if (mappingUpdateType === 'rename') {
                visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                  if (vp.mapping != null) {
                    setMapping(props.currentNetworkId, vp.name, {
                      ...vp.mapping,
                      attribute: newColumnName,
                    })
                  }
                })
              } else if (mappingUpdateType === 'delete') {
                visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                  setMapping(props.currentNetworkId, vp.name, undefined)
                })
              }
              setColumnFormError(undefined)
              setShowEditColumnForm(false)
            }
          }}
        />
        <DeleteTableColumnForm
          error={deleteColumnFormError}
          dependentVisualProperties={visualPropertiesDependentOnSelectedColumn}
          open={showDeleteColumnForm}
          column={selectedColumn}
          onClose={() => {
            setShowDeleteColumnForm(false)
            setDeleteColumnFormError(undefined)
          }}
          onSubmit={(mappingUpdateType) => {
            deleteColumn(
              props.currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              selectedColumn.id,
            )
            if (mappingUpdateType === 'delete') {
              visualPropertiesDependentOnSelectedColumn.forEach((vp) => {
                setMapping(props.currentNetworkId, vp.name, undefined)
              })
            }
            setShowDeleteColumnForm(false)
            setDeleteColumnFormError(undefined)
            setSelection({
              columns: CompactSelection.empty(),
              rows: CompactSelection.empty(),
            })
          }}
        />
      </>
    ) : null

  const selectedCell =
    selection.rows.length > 0 &&
    selectedCellColumn !== null &&
    selectedCellColumn >= 0
      ? [selectedCellColumn, selection.rows.first()!]
      : null

  const selectedCellToolbar =
    selectedCell != null ? (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            bgColor: '#d9d9d9',
            minWidth: '540px',
          }}
        >
          <ButtonGroup size="small">
            <Button
              onClick={() => {
                const [columnIndex, rowIndex] = selectedCell
                const rowData = rows?.[rowIndex]
                // const cxId = rowData?.id
                const column = columns?.[columnIndex]
                const columnKey = column.id
                const cellValue = (rowData as any)?.[columnKey]
                applyValueToElemenets(
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                  cellValue,
                  undefined,
                )
              }}
            >
              Apply value to column
            </Button>
            <Button
              onClick={() => {
                const [columnIndex, rowIndex] = selectedCell
                const rowData = rows?.[rowIndex]
                // const cxId = rowData?.id
                const column = columns?.[columnIndex]
                const columnKey = column.id
                const cellValue = (rowData as any)?.[columnKey]
                applyValueToElemenets(
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                  cellValue,
                  rows.map((r) => r.id),
                )
              }}
            >
              {`Apply value to selected ${
                currentTable === nodeTable ? 'nodes' : 'edges'
              }`}
            </Button>
            <Button
              onClick={() => {
                const rowsToSelect = selection.rows.toArray()
                const rowIds = rowsToSelect
                  .map((r) => rows?.[r].id)
                  .filter((id) => id !== undefined)
                if (currentTable === nodeTable) {
                  exclusiveSelect(props.currentNetworkId, rowIds, [])
                } else {
                  exclusiveSelect(props.currentNetworkId, [], rowIds)
                }
                setSelection({
                  ...selection,
                  rows: CompactSelection.empty(),
                })
              }}
            >
              {`Select ${currentTable === nodeTable ? 'nodes' : 'edges'}`}{' '}
            </Button>
          </ButtonGroup>
        </Box>
      </>
    ) : null

  const tableBrowserToolbar = (
    <Box sx={{ height: TOOLBAR_HEIGHT, display: 'flex', alignItems: 'center' }}>
      <Tooltip
        title="Search"
        placement="bottom"
        PopperProps={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -24],
              },
            },
          ],
        }}
      >
        <Button
          sx={{ mr: 1 }}
          disabled={tables[props.currentNetworkId] === undefined}
          onClick={() => setShowSearch(!showSearch)}
        >
          <span className="icon">&#82;</span>
        </Button>
      </Tooltip>
      <Tooltip
        title="Insert New Column"
        placement="bottom"
        PopperProps={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -24],
              },
            },
          ],
        }}
      >
        <Button
          sx={{ mr: 1 }}
          disabled={tables[props.currentNetworkId] === undefined}
          onClick={() => setShowCreateColumnForm(true)}
        >
          <span className="icon">&#8209;</span>
        </Button>
      </Tooltip>
      <Tooltip
        title="Import Table from File ..."
        placement="bottom"
        PopperProps={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, -24],
              },
            },
          ],
        }}
      >
        <Button
          disabled={tables[props.currentNetworkId] === undefined}
          sx={{ mr: 1 }}
          onClick={() => showTableJoinForm(true)}
        >
          <span className="icon">&#44;</span>
        </Button>
      </Tooltip>
      <CreateTableColumnForm
        error={createColumnFormError}
        open={showCreateColumnForm}
        onClose={() => {
          setShowCreateColumnForm(false)
          setCreateColumnFormError(undefined)
        }}
        onSubmit={(
          columnName: string,
          dataType: ValueTypeName,
          value: string,
        ) => {
          const columnNameSet = new Set(columns?.map((c) => c.id))
          const columnNameAlreadyExists = columnNameSet.has(columnName)
          const valueIsValid = serializedStringIsValid(dataType, value)
          if (columnNameAlreadyExists) {
            setCreateColumnFormError(
              `${columnName} already exists.  Please enter a new unique column name`,
            )
          } else {
            if (!valueIsValid) {
              setCreateColumnFormError(
                `Default value ${value} is not a valid ${dataType}.  Please enter a valid ${dataType}`,
              )
            } else {
              const valueType = deserializeValue(dataType, value)
              addColumn(
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                columnName,
                dataType,
                valueType,
              )
              setCreateColumnFormError(undefined)
              setSelection({
                ...selection,
                columns: CompactSelection.fromSingleSelection(0), // the new column is always placed at the most left side
              })
              setShowCreateColumnForm(false)
            }
          }
        }}
      />
      {selectedColumnToolbar}
      {selectedCellToolbar}
    </Box>
  )

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
      }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2F80ED',
        }}
      >
        <Tabs
          value={currentTabIndex}
          onChange={handleChange}
          aria-label="tabs"
          TabIndicatorProps={{ sx: { backgroundColor: 'white' } }}
          sx={{
            fontSize: 12,
            '& button.Mui-selected': { color: 'white' },
            '& button': {
              minHeight: TABS_HEIGHT,
              height: TABS_HEIGHT,
              width: 200,
            },
            height: TABS_HEIGHT,
            minHeight: TABS_HEIGHT,
          }}
        >
          <Tab label={<Typography variant="caption">Nodes</Typography>} />
          <Tab label={<Typography variant="caption">Edges</Typography>} />
          <Tab label={<Typography variant="caption">Network</Typography>} />
        </Tabs>
        {panels[Panel.BOTTOM] === PanelState.CLOSED ? (
          <KeyboardArrowUp
            sx={{ color: 'white' }}
            onClick={() => {
              setPanelState(Panel.BOTTOM, PanelState.OPEN)
              props.setHeight(200)
            }}
          />
        ) : (
          <KeyboardArrowDown
            sx={{ color: 'white' }}
            onClick={() => {
              setPanelState(Panel.BOTTOM, PanelState.CLOSED)
              props.setHeight(0)
            }}
          />
        )}
      </Box>
      <TabPanel value={currentTabIndex} index={0}>
        {tableBrowserToolbar}
        <DataEditor
          // rowSelectionBlending="mixed"
          ref={nodeDataEditorRef}
          onCellClicked={onCellClicked}
          rowSelect={'multi'}
          rowMarkers={'checkbox'}
          rowMarkerWidth={1}
          rowMarkerStartIndex={minNodeId}
          showSearch={showSearch}
          keybindings={{ search: true }}
          onPaste={true}
          getCellsForSelection={true}
          onSearchClose={onSearchClose}
          onHeaderClicked={onHeaderClicked}
          onColumnMoved={onColMoved}
          onItemHovered={(e) => onItemHovered(e.location)}
          overscrollX={10}
          overscrollY={10}
          onColumnResizeEnd={onColumnResize}
          width={props.width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={maxNodeId - minNodeId + 1}
          gridSelection={selection}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        {tableBrowserToolbar}
        <DataEditor
          // rowSelectionBlending="mixed"
          ref={edgeDataEditorRef}
          onCellClicked={onCellClicked}
          rowSelect={'multi'}
          rowMarkers={'checkbox'}
          rowMarkerWidth={1}
          rowMarkerStartIndex={minEdgeId}
          showSearch={showSearch}
          keybindings={{ search: true }}
          getCellsForSelection={true}
          onPaste={true}
          onSearchClose={onSearchClose}
          onHeaderClicked={onHeaderClicked}
          onColumnMoved={onColMoved}
          onItemHovered={(e) => onItemHovered(e.location)}
          overscrollX={10}
          overscrollY={10}
          onColumnResizeEnd={onColumnResize}
          width={props.width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={maxEdgeId - minEdgeId + 1}
          gridSelection={selection}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={2}>
        <NetworkInfoPanel height={props.height - TOOLBAR_HEIGHT - 1} />
      </TabPanel>
    </Box>
  )
}
