import '../../assets/icons.css'

import {
  CellClickedEventArgs,
  CompactSelection,
  DataEditor,
  DataEditorRef,
  EditableGridCell,
  GridCell,
  GridCellKind,
  GridColumn,
  GridColumnIcon,
  GridSelection,
  Item,
} from '@glideapps/glide-data-grid'
import {
  CheckBoxOutlined as CheckBoxOutlinedIcon,
  ContentCopy,
  ContentPaste,
} from '@mui/icons-material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import {
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import orderBy from 'lodash/orderBy'
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
import { CellEdit } from '../../models/StoreModel/TableStoreModel'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { Table, ValueType, ValueTypeName } from '../../models/TableModel'
import {
  deserializeValue,
  deserializeValueList,
  isListType,
  serializedStringIsValid,
  SortType,
  valueDisplay,
} from '../../models/TableModel/impl/valueTypeImpl'
import { Ui } from '../../models/UiModel'
import { Panel } from '../../models/UiModel/Panel'
import { PanelState } from '../../models/UiModel/PanelState'
import { NetworkView } from '../../models/ViewModel'
import type { ColumnConfiguration } from '../../models/VisualStyleModel/VisualStyleOptions'
import { isValidUrl } from '../../utils/urlUtil'
import { useJoinTableToNetworkStore } from '../TableDataLoader/store/joinTableToNetworkStore'
import { DuplicateIcon, EditIcon, SortAscIcon, SortDescIcon } from './Icon'
import NetworkInfoPanel from './NetworkInfoPanel'
import {
  CreateTableColumnForm,
  DeleteTableColumnForm,
  EditTableColumnForm,
} from './TableColumnForm'

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
const TABS_HEIGHT = 32
const TOOLBAR_HEIGHT = 36

// Adjust Data Grid size
const GRID_GAP = TABS_HEIGHT + TOOLBAR_HEIGHT + 15

const ButtonTooltip = ({
  title,
  children,
}: {
  title: string
  children: React.ReactElement
}) => (
  <Tooltip
    title={title}
    placement="top"
    PopperProps={{
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, -16],
          },
        },
      ],
    }}
  >
    {children}
  </Tooltip>
)

const ToolbarIconButton = ({
  title,
  disabled = false,
  onClick,
  children,
}: {
  title: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactElement
}) => (
  <ButtonTooltip title={title}>
    <span>
      <Button
        disabled={disabled}
        onClick={onClick}
        sx={{
          minWidth: 48,
          maxWidth: 48,
          height: 48,
          p: 0,
          color: (theme) => theme.palette.text.primary,
        }}
      >
        {children}
      </Button>
    </span>
  </ButtonTooltip>
)

const ToolbarTextButton = ({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) => (
  <Button
    variant="outlined"
    size="small"
    onClick={onClick}
    sx={{
      textTransform: 'none',
      color: (theme) => theme.palette.text.primary,
      borderColor: (theme) => theme.palette.text.secondary,
      borderRadius: 4,
    }}
  >
    {children}
  </Button>
)

function TabPanel(props: TabPanelProps): React.ReactElement {
  const { children, value, index, ...other } = props

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{ flexGrow: 1 }}
      {...other}
    >
      {value === index && <>{children}</>}
    </Box>
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
}): React.ReactElement {
  const { width } = useWindowSize()
  const { postEdit } = useUndoStack()
  const ui: Ui = useUiStateStore((state) => state.ui)
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)
  const setUi = useUiStateStore((state) => state.setUi)
  const currentTabIndex = ui.tableUi.activeTabIndex

  const theme = useTheme()

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

  const [contextMenu, setContextMenu] = React.useState<{
    anchorPosition: { top: number; left: number }
    cell: Item
  } | null>(null)

  const handleContextMenuClose = React.useCallback(() => {
    setContextMenu(null)
  }, [])

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

  const onGridSelectionChange = React.useCallback(
    (newSelection: GridSelection) => {
      setSelection(newSelection)
    },
    [setSelection],
  )

  const nodeDataEditorRef = React.useRef<DataEditorRef>(null)
  const edgeDataEditorRef = React.useRef<DataEditorRef>(null)

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
  const selectedNodes = useViewModelStore(() => viewModel?.selectedNodes ?? [])
  const selectedEdges = useViewModelStore(() => viewModel?.selectedEdges ?? [])

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
  const currentTable = currentTabIndex === 0 ? nodeTable : edgeTable
  const network = useNetworkStore((state) => state.networks.get(networkId))
  const currentTableConfig =
    currentTabIndex === 0
      ? tableDisplayConfiguration?.nodeTable
      : tableDisplayConfiguration?.edgeTable

  const nodeIds = Array.from(nodeTable?.rows?.keys() ?? new Map()).map(
    (v) => +v,
  )
  const edgeIds = Array.from(edgeTable?.rows?.keys() ?? new Map()).map(
    (v) => +v.slice(1),
  )
  const maxNodeId = nodeIds.sort((a, b) => b - a)[0]
  const minNodeId = nodeIds.sort((a, b) => a - b)[0]
  const maxEdgeId = edgeIds.sort((a, b) => b - a)[0]
  const minEdgeId = edgeIds.sort((a, b) => a - b)[0]
  // Temporary fix: fallback to table columns if tableDisplayConfiguration is not found
  const modelColumns =
    currentTableConfig?.columnConfiguration ??
    currentTable?.columns?.map((col) => ({
      attributeName: col.name,
      visible: true,
      columnWidth: undefined,
    })) ??
    []

  // Utility function to create a new TableDisplayConfiguration with updates
  const createUpdatedTableDisplayConfiguration = React.useCallback(
    (updates: {
      columnConfiguration?: ColumnConfiguration[]
      sortColumn?: string
      sortDirection?: 'ascending' | 'descending'
    }) => {
      const isNodeTable = currentTable === nodeTable
      // Temporary fix: create default config from table columns if tableDisplayConfiguration is missing
      const defaultNodeConfig = {
        columnConfiguration:
          nodeTable?.columns?.map((col) => ({
            attributeName: col.name,
            visible: true,
            columnWidth: undefined,
          })) ?? [],
        sortColumn: undefined,
        sortDirection: undefined,
      }
      const defaultEdgeConfig = {
        columnConfiguration:
          edgeTable?.columns?.map((col) => ({
            attributeName: col.name,
            visible: true,
            columnWidth: undefined,
          })) ?? [],
        sortColumn: undefined,
        sortDirection: undefined,
      }
      const currentConfig = isNodeTable
        ? (tableDisplayConfiguration?.nodeTable ?? defaultNodeConfig)
        : (tableDisplayConfiguration?.edgeTable ?? defaultEdgeConfig)
      const otherConfig = isNodeTable
        ? (tableDisplayConfiguration?.edgeTable ?? defaultEdgeConfig)
        : (tableDisplayConfiguration?.nodeTable ?? defaultNodeConfig)

      const updatedConfig = {
        ...currentConfig,
        ...updates,
      }

      return isNodeTable
        ? {
            nodeTable: updatedConfig,
            edgeTable: otherConfig,
          }
        : {
            nodeTable: otherConfig,
            edgeTable: updatedConfig,
          }
    },
    [tableDisplayConfiguration, currentTable, nodeTable, edgeTable],
  )

  // Initialize sort state from tableDisplayConfiguration
  React.useEffect(() => {
    if (currentTableConfig?.sortColumn && currentTableConfig?.sortDirection) {
      // Find the column type for the sort column
      const sortColumn = currentTable?.columns?.find(
        (c) => c.name === currentTableConfig.sortColumn,
      )

      setSort({
        column: currentTableConfig.sortColumn,
        direction:
          currentTableConfig.sortDirection === 'ascending' ? 'asc' : 'desc',
        valueType: sortColumn?.type ?? ValueTypeName.String,
      })
    }
  }, [
    tableDisplayConfiguration,
    currentTabIndex,
    currentTable,
    currentTableConfig,
  ])

  const columns = modelColumns.map((col, index) => {
    const columnType = currentTable?.columns?.find(
      (c) => c?.name === col?.attributeName,
    )?.type

    return {
      id: col?.attributeName ?? '',
      title: col?.attributeName ?? '',
      type: columnType ?? ValueTypeName.String,
      index,
      width: col?.columnWidth,
    }
  })

  // Add virtual columns for edge table to show source and target node names
  const virtualColumns = React.useMemo(() => {
    if (currentTable !== edgeTable) {
      return []
    }

    // Create a map of node ID to node name/label for lookup
    const nodeNameMap = new Map<string, string>()
    if (nodeTable) {
      nodeTable.rows.forEach((nodeData, nodeId) => {
        const nodeName =
          (nodeData.name as string) ||
          (nodeData.label as string) ||
          (nodeData.nodeLabel as string) ||
          (nodeData.displayName as string) ||
          (nodeData.title as string) ||
          nodeId.toString()
        nodeNameMap.set(nodeId.toString(), nodeName)
      })
    }

    return [
      {
        id: '__sourceNodeName',
        title: 'Source Node',
        icon: GridColumnIcon.ProtectedColumnOverlay,
        style: 'highlight',
        type: ValueTypeName.String,
        index: 0,
        width: undefined,
        isVirtual: true,
        getValue: (edgeData: any) => {
          // Get edge id from edgeData
          const edgeId = edgeData?.id?.toString()
          // Look up edge in network model
          const edge = network?.edges?.find(
            (e: any) => e.id?.toString() === edgeId,
          )
          const sourceId = edge?.s?.toString()
          return sourceId ? nodeNameMap.get(sourceId) || `Node ${sourceId}` : ''
        },
      },
      {
        id: '__targetNodeName',
        title: 'Target Node',
        icon: GridColumnIcon.ProtectedColumnOverlay,
        style: 'highlight',

        type: ValueTypeName.String,
        index: 1,
        width: undefined,
        isVirtual: true,
        getValue: (edgeData: any) => {
          const edgeId = edgeData?.id?.toString()
          const edge = network?.edges?.find(
            (e: any) => e.id?.toString() === edgeId,
          )
          const targetId = edge?.t?.toString()
          return targetId ? nodeNameMap.get(targetId) || `Node ${targetId}` : ''
        },
      },
    ]
  }, [currentTable, edgeTable, nodeTable, network])

  // Combine regular columns with virtual columns for edge table
  const allColumns =
    currentTable === edgeTable ? [...virtualColumns, ...columns] : columns

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
      // Handle sorting for virtual columns
      if (
        sort.column === '__sourceNodeName' ||
        sort.column === '__targetNodeName'
      ) {
        // Create a map of node ID to node name for lookup
        const nodeNameMap = new Map<string, string>()
        if (nodeTable) {
          nodeTable.rows.forEach((nodeData, nodeId) => {
            const nodeName =
              (nodeData.name as string) ||
              (nodeData.label as string) ||
              (nodeData.nodeLabel as string) ||
              (nodeData.displayName as string) ||
              (nodeData.title as string) ||
              nodeId.toString()
            nodeNameMap.set(nodeId.toString(), nodeName)
          })
        }

        rows = orderBy(
          rows,
          (o) => {
            if (sort.column === '__sourceNodeName') {
              const sourceId = (o as any).s?.toString()
              return sourceId
                ? nodeNameMap.get(sourceId) || `Node ${sourceId}`
                : ''
            } else if (sort.column === '__targetNodeName') {
              const targetId = (o as any).t?.toString()
              return targetId
                ? nodeNameMap.get(targetId) || `Node ${targetId}`
                : ''
            }
            return ''
          },
          sort.direction,
        )
      } else {
        // Regular column sorting
        rows = orderBy(
          rows,
          (o) =>
            (o as Record<string, ValueType>)[
              sort.column as string
            ] as ValueType,
          sort.direction,
        )
      }
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
      const column = allColumns?.[columnIndex]
      const columnKey = column?.id

      // Handle virtual columns
      if ((column as any).isVirtual) {
        const virtualColumn = column as any
        const cellValue = virtualColumn.getValue(dataRow)
        return {
          cursor: 'not-allowed',
          themeOverride: {
            bgCell: '#D9D9D9',
          },
          allowOverlay: false, // Virtual columns are read-only
          readonly: true,
          kind: GridCellKind.Text,
          displayData: String(cellValue),
          data: String(cellValue),
        }
      }

      if (dataRow == null || column == null) {
        return {
          allowOverlay: true,
          readonly: false,
          kind: GridCellKind.Text,
          displayData: '',
          data: '',
        }
      }

      // Handle regular columns
      const cellValue = (dataRow as any)?.[columnKey]
      if (cellValue == null) {
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

      // These cells generally prevent users from inputting mismatched data types
      // e.g. a user can't but a boolean in a number, a string in a number, etc.
      // The exception is that users can still input floats into integer columns
      // Extra validation for this logic is done in onCellEdited
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
    [
      props.currentNetworkId,
      rows,
      currentTable,
      tables,
      sort,
      currentTabIndex,
      allColumns,
    ],
  )

  const onColMoved = React.useCallback(
    (startIndex: number, endIndex: number): void => {
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
      const realStartIndex = realColumns.findIndex(
        (col) => col.id === startColId,
      )
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
      const defaultConfig = {
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

      // Use utility function to create new configuration
      const newTableDisplayConfiguration =
        createUpdatedTableDisplayConfiguration({
          columnConfiguration: nextColumnConfig,
        })
      setTableDisplayConfiguration(networkId, newTableDisplayConfiguration)
      setNetworkModified(networkId, true)
    },
    [
      allColumns,
      modelColumns,
      createUpdatedTableDisplayConfiguration,
      currentTable,
      nodeTable,
      edgeTable,
      moveColumn,
      networkId,
      setTableDisplayConfiguration,
      setNetworkModified,
      tableDisplayConfiguration,
      virtualColumns,
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
    [props.currentNetworkId, currentTable, tables],
  )

  const onColumnResize = React.useCallback(
    (column: GridColumn, newSize: number, colIndex: number): void => {
      if (column?.id !== undefined) {
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

        // Update the width in the tableDisplayConfiguration using utility function
        // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
        const defaultConfig = {
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
        const nextColumnConfig = currentConfig.columnConfiguration.map((col) =>
          col.attributeName === column.id
            ? { ...col, columnWidth: newSize }
            : col,
        )

        const newTableDisplayConfiguration =
          createUpdatedTableDisplayConfiguration({
            columnConfiguration: nextColumnConfig,
          })
        setTableDisplayConfiguration(networkId, newTableDisplayConfiguration)
        setNetworkModified(networkId, true)
      }
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
      const [columnIndex, rowIndex] = cell
      const rowData = rows?.[rowIndex]
      const cxId = rowData?.id
      const column = columns?.[columnIndex]
      const columnKey = column.id
      let data = newValue.data

      if (rowData == null || cxId == null || column == null || data == null)
        return
      const prevCellValue = (rowData as any)?.[columnKey]

      if (isListType(column.type)) {
        if (serializedStringIsValid(column.type, data as string)) {
          data = deserializeValueList(column.type, data as string)
          postEdit(
            UndoCommandType.SET_CELL_VALUE,
            'Set cell value',
            [
              props.currentNetworkId,
              currentTable == nodeTable ? 'node' : 'edge',
              cxId,
              columnKey,
              prevCellValue,
            ],
            [
              props.currentNetworkId,
              currentTable == nodeTable ? 'node' : 'edge',
              cxId,
              columnKey,
              data as ValueType,
            ],
          )
          setCellValue(
            props.currentNetworkId,
            currentTable === nodeTable ? 'node' : 'edge',
            `${cxId}`,
            columnKey,
            data as ValueType,
          )
          setNetworkModified(networkId, true)
        }
      } else {
        if (
          column.type !== ValueTypeName.Integer &&
          column.type !== ValueTypeName.Long
        ) {
          postEdit(
            UndoCommandType.SET_CELL_VALUE,
            'Set cell value',
            [
              props.currentNetworkId,
              currentTable == nodeTable ? 'node' : 'edge',
              cxId,
              columnKey,
              prevCellValue,
            ],
            [
              props.currentNetworkId,
              currentTable == nodeTable ? 'node' : 'edge',
              cxId,
              columnKey,
              data as ValueType,
            ],
          )
          setCellValue(
            props.currentNetworkId,
            currentTable === nodeTable ? 'node' : 'edge',
            `${cxId}`,
            columnKey,
            data as ValueType,
          )
          setNetworkModified(networkId, true)
        } else {
          if (Number.isInteger(data)) {
            postEdit(
              UndoCommandType.SET_CELL_VALUE,
              'Set cell value',
              [
                props.currentNetworkId,
                currentTable == nodeTable ? 'node' : 'edge',
                cxId,
                columnKey,
                prevCellValue,
              ],
              [
                props.currentNetworkId,
                currentTable == nodeTable ? 'node' : 'edge',
                cxId,
                columnKey,
                parseFloat(data as string),
              ],
            )
            setCellValue(
              props.currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              `${cxId}`,
              columnKey,
              parseFloat(data as string),
            )
            setNetworkModified(networkId, true)
          } else {
            // the user is trying to assign a double value to a integer column.  Ignore this value.
          }
        }
      }
    },
    [props.currentNetworkId, currentTable, tables, sort, rows],
  )

  const onPaste = React.useCallback(
    (target: Item, values: readonly (readonly string[])[]) => {
      const [startCol, startRow] = target
      const cellEdits: CellEdit[] = []
      const prevCellEdits: CellEdit[] = []

      for (let dy = 0; dy < values.length; dy++) {
        const rowIndex = startRow + dy
        const rowData = rows?.[rowIndex]
        if (rowData == null) continue

        for (let dx = 0; dx < values[dy].length; dx++) {
          const colIndex = startCol + dx
          const column = allColumns?.[colIndex]
          if (column == null || (column as any).isVirtual) continue

          const pastedString = values[dy][dx]
          if (!serializedStringIsValid(column.type, pastedString)) continue

          const newValue = deserializeValue(column.type, pastedString)
          const prevValue = (rowData as any)?.[column.id] as ValueType

          cellEdits.push({
            row: rowData.id,
            column: column.id,
            value: newValue as ValueType,
          })
          prevCellEdits.push({
            row: rowData.id,
            column: column.id,
            value: prevValue,
          })
        }
      }

      if (cellEdits.length > 0) {
        postEdit(
          UndoCommandType.APPLY_VALUE_TO_SELECTED,
          'Paste cell values',
          [
            props.currentNetworkId,
            currentTable === nodeTable ? 'node' : 'edge',
            prevCellEdits,
          ],
          [
            props.currentNetworkId,
            currentTable === nodeTable ? 'node' : 'edge',
            cellEdits,
          ],
        )
        setValues(
          props.currentNetworkId,
          currentTable === nodeTable ? 'node' : 'edge',
          cellEdits,
        )
        setNetworkModified(networkId, true)
      }

      return false
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
      networkId,
    ],
  )

  const selectedColumn =
    selection.columns.length > 0 ? allColumns[selection.columns.first()!] : null

  // Check if the selected column is a virtual column
  const isSelectedColumnVirtual =
    selectedColumn && (selectedColumn as any).isVirtual

  // scan the visual properties to see if the selected column name is used in any mappings
  const visualPropertiesDependentOnSelectedColumn = Object.values(
    visualStyle ?? {},
  ).filter(
    (vpValue) =>
      selectedColumn?.id != null &&
      vpValue?.mapping?.attribute === selectedColumn.id,
  )
  const selectedColumnToolbar =
    selectedColumn != null && !isSelectedColumnVirtual ? (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <ToolbarIconButton
            title="Sort ascending"
            onClick={() => {
              if (selectedColumn != null) {
                const columnKey = selectedColumn.id
                const columnType = selectedColumn.type

                setSort({
                  column: columnKey,
                  direction: 'asc',
                  valueType: columnType,
                })

                // Use utility function to update tableDisplayConfiguration with sort info
                const newTableDisplayConfiguration =
                  createUpdatedTableDisplayConfiguration({
                    sortColumn: columnKey,
                    sortDirection: 'ascending',
                  })

                setTableDisplayConfiguration(
                  networkId,
                  newTableDisplayConfiguration,
                )
                setNetworkModified(networkId, true)
              }
            }}
          >
            <SortAscIcon fill={theme.palette.text.primary} />
          </ToolbarIconButton>
          <ToolbarIconButton
            title="Sort descending"
            onClick={() => {
              if (selectedColumn != null) {
                const columnKey = selectedColumn.id
                const columnType = selectedColumn.type
                setSort({
                  column: columnKey,
                  direction: 'desc',
                  valueType: columnType,
                })

                // Use utility function to update tableDisplayConfiguration with sort info
                const newTableDisplayConfiguration =
                  createUpdatedTableDisplayConfiguration({
                    sortColumn: columnKey,
                    sortDirection: 'descending',
                  })
                setTableDisplayConfiguration(
                  networkId,
                  newTableDisplayConfiguration,
                )
                setNetworkModified(networkId, true)
              }
            }}
          >
            <SortDescIcon fill={theme.palette.text.primary} />
          </ToolbarIconButton>
          <ToolbarIconButton
            title="Duplicate column"
            onClick={() => {
              if (
                selectedColumn !== null &&
                !(selectedColumn as any)?.isVirtual
              ) {
                const columnKey = selectedColumn.id
                duplicateColumn(
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                )
                setNetworkModified(networkId, true)

                setSelection({
                  ...selection,
                  columns: CompactSelection.fromSingleSelection(
                    selectedColumn.index + 1, // select the newly created column
                  ),
                })

                // Update tableDisplayConfiguration for duplicate
                // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
                const defaultConfig = {
                  columnConfiguration:
                    (currentTable === nodeTable
                      ? nodeTable
                      : edgeTable
                    )?.columns?.map((col) => ({
                      attributeName: col.name,
                      visible: true,
                      columnWidth: undefined,
                    })) ?? [],
                  sortColumn: undefined,
                  sortDirection: undefined,
                }
                const currentConfig =
                  currentTable === nodeTable
                    ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                    : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
                // Find the duplicated column in the config
                const duplicatedCol = currentConfig.columnConfiguration.find(
                  (col) => col.attributeName === columnKey,
                )
                // The new column will have a new name, which should be the next column in the table
                // We'll assume the duplicated column is inserted right after the original
                // Find the new column name by checking the columns array
                const allColumnNames = columns.map((c) => c.id)
                const originalIndex = allColumnNames.indexOf(columnKey)
                const newColumnName = allColumnNames[originalIndex + 1]
                if (duplicatedCol && newColumnName) {
                  const newColConfig = [
                    ...currentConfig.columnConfiguration.slice(
                      0,
                      originalIndex + 1,
                    ),
                    { ...duplicatedCol, attributeName: newColumnName },
                    ...currentConfig.columnConfiguration.slice(
                      originalIndex + 1,
                    ),
                  ]
                  const newTableDisplayConfiguration =
                    createUpdatedTableDisplayConfiguration({
                      columnConfiguration: newColConfig,
                    })
                  setTableDisplayConfiguration(
                    networkId,
                    newTableDisplayConfiguration,
                  )
                  setNetworkModified(networkId, true)
                }
              }
            }}
            disabled={(selectedColumn as any)?.isVirtual}
          >
            <DuplicateIcon fill={theme.palette.text.primary} />
          </ToolbarIconButton>
          <ToolbarIconButton
            title="Rename column"
            onClick={() => setShowEditColumnForm(true)}
            disabled={(selectedColumn as any)?.isVirtual}
          >
            <EditIcon fill={theme.palette.text.primary} />
          </ToolbarIconButton>
          <ToolbarIconButton
            title="Delete column"
            onClick={() => {
              setShowDeleteColumnForm(true)
            }}
            disabled={(selectedColumn as any)?.isVirtual}
          >
            <span className="icon">&#46;</span>
          </ToolbarIconButton>
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
              postEdit(
                UndoCommandType.RENAME_COLUMN,
                `Rename column '${selectedColumn.title}' to '${newColumnName}'`,
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  newColumnName,
                  selectedColumn.id,
                ],
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  selectedColumn.id,
                  newColumnName,
                ],
              )
              setColumnName(
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                selectedColumn.id,
                newColumnName,
              )
              setNetworkModified(networkId, true)

              // Update tableDisplayConfiguration for rename
              // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
              const defaultConfig = {
                columnConfiguration:
                  (currentTable === nodeTable
                    ? nodeTable
                    : edgeTable
                  )?.columns?.map((col) => ({
                    attributeName: col.name,
                    visible: true,
                    columnWidth: undefined,
                  })) ?? [],
                sortColumn: undefined,
                sortDirection: undefined,
              }
              const currentConfig =
                currentTable === nodeTable
                  ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                  : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
              const newColumnConfig = currentConfig.columnConfiguration.map(
                (col) =>
                  col.attributeName === selectedColumn.id
                    ? { ...col, attributeName: newColumnName }
                    : col,
              )
              const newTableDisplayConfiguration =
                createUpdatedTableDisplayConfiguration({
                  columnConfiguration: newColumnConfig,
                })
              setTableDisplayConfiguration(
                networkId,
                newTableDisplayConfiguration,
              )
              setNetworkModified(networkId, true)

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
            postEdit(
              UndoCommandType.DELETE_COLUMN,
              `Delete ${currentTable === nodeTable ? 'node' : 'edge'} column ${selectedColumn.title}`,
              [
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                currentTable,
                selectedColumn,
              ],
              [
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                currentTable,
                selectedColumn,
              ],
            )
            deleteColumn(
              props.currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              selectedColumn.id,
            )
            setNetworkModified(networkId, true)

            // Update tableDisplayConfiguration for delete
            // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
            const defaultConfig = {
              columnConfiguration:
                (currentTable === nodeTable
                  ? nodeTable
                  : edgeTable
                )?.columns?.map((col) => ({
                  attributeName: col.name,
                  visible: true,
                  columnWidth: undefined,
                })) ?? [],
              sortColumn: undefined,
              sortDirection: undefined,
            }
            const currentConfig =
              currentTable === nodeTable
                ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
            const newColumnConfig = currentConfig.columnConfiguration.filter(
              (col) => col.attributeName !== selectedColumn.id,
            )
            const newTableDisplayConfiguration =
              createUpdatedTableDisplayConfiguration({
                columnConfiguration: newColumnConfig,
              })
            setTableDisplayConfiguration(
              networkId,
              newTableDisplayConfiguration,
            )
            setNetworkModified(networkId, true)

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

  const selectedCell = selection.current?.cell ?? null

  // Check if the selected cell is in a virtual column
  const isSelectedCellVirtual =
    selectedCell != null &&
    allColumns[selectedCell[0]] &&
    (allColumns[selectedCell[0]] as any).isVirtual

  const selectedCellToolbar =
    selectedCell != null && !isSelectedCellVirtual ? (
      <>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            ml: 2,
            backgroundColor: 'transparent',
            minWidth: '540px',
          }}
        >
          <ToolbarTextButton
            onClick={() => {
              const [columnIndex, rowIndex] = selectedCell
              const rowData = rows?.[rowIndex]
              const column = allColumns?.[columnIndex]
              const columnKey = column.id
              const cellValue = (rowData as any)?.[columnKey]
              const cellEdits: CellEdit[] = []
              const prevColumnValues: CellEdit[] = []
              Array.from(currentTable.rows.entries()).map(([k, v]) => {
                cellEdits.push({
                  row: k,
                  column: columnKey,
                  value: cellValue,
                })

                prevColumnValues.push({
                  row: k,
                  column: columnKey,
                  value: (v as any)?.[columnKey] as ValueType,
                })
              })
              postEdit(
                UndoCommandType.APPLY_VALUE_TO_COLUMN,
                'Apply value to column',
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  prevColumnValues,
                ],
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  cellEdits,
                ],
              )
              applyValueToElemenets(
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                columnKey,
                cellValue,
                undefined,
              )
              setNetworkModified(networkId, true)
            }}
          >
            Apply Value to Column
          </ToolbarTextButton>
          <ToolbarTextButton
            onClick={() => {
              const [columnIndex, rowIndex] = selectedCell
              const rowData = rows?.[rowIndex]
              const column = allColumns?.[columnIndex]
              const columnKey = column.id
              const cellValue = (rowData as any)?.[columnKey]
              const cellEdits: CellEdit[] = []
              const prevColumnValues: CellEdit[] = []

              rows.forEach((r) => {
                const rowId = r.id
                cellEdits.push({
                  row: rowId,
                  column: columnKey,
                  value: cellValue,
                })

                prevColumnValues.push({
                  row: rowId,
                  column: columnKey,
                  value: (r as any)?.[columnKey] as ValueType,
                })
              })

              postEdit(
                UndoCommandType.APPLY_VALUE_TO_SELECTED,
                'Apply value to selected elements',
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  prevColumnValues,
                ],
                [
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  cellEdits,
                ],
              )
              applyValueToElemenets(
                props.currentNetworkId,
                currentTable === nodeTable ? 'node' : 'edge',
                columnKey,
                cellValue,
                rows.map((r) => r.id),
              )
              setNetworkModified(networkId, true)
            }}
          >
            {`Apply Value to Selected ${
              currentTable === nodeTable ? 'Nodes' : 'Edges'
            }`}
          </ToolbarTextButton>
        </Box>
      </>
    ) : null

  const selectedRowToolbar =
    selection.rows.length > 0 ? (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          ml: 2,
          backgroundColor: 'transparent',
        }}
      >
        <ToolbarTextButton
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
          {`Select ${currentTable === nodeTable ? 'Nodes' : 'Edges'}`}{' '}
        </ToolbarTextButton>
      </Box>
    ) : null

  const tableBrowserToolbar = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        ml: 1,
        backgroundColor: 'transparent',
      }}
    >
      <ToolbarIconButton
        title="Insert new column"
        disabled={tables[props.currentNetworkId] === undefined}
        onClick={() => setShowCreateColumnForm(true)}
      >
        <span className="icon">&#8209;</span>
      </ToolbarIconButton>
      <ToolbarIconButton
        title="Import table from file..."
        disabled={tables[props.currentNetworkId] === undefined}
        onClick={() => showTableJoinForm(true)}
      >
        <span className="icon">&#44;</span>
      </ToolbarIconButton>
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
              setNetworkModified(networkId, true)

              // Also add the new column to the tableDisplayConfiguration
              // Temporary fix: fallback to table columns if tableDisplayConfiguration is missing
              const defaultConfig = {
                columnConfiguration:
                  (currentTable === nodeTable
                    ? nodeTable
                    : edgeTable
                  )?.columns?.map((col) => ({
                    attributeName: col.name,
                    visible: true,
                    columnWidth: undefined,
                  })) ?? [],
                sortColumn: undefined,
                sortDirection: undefined,
              }
              const currentConfig =
                currentTable === nodeTable
                  ? (tableDisplayConfiguration?.nodeTable ?? defaultConfig)
                  : (tableDisplayConfiguration?.edgeTable ?? defaultConfig)
              const newColumnConfig = [
                {
                  attributeName: columnName,
                  visible: true,
                  columnWidth: undefined,
                },
                ...currentConfig.columnConfiguration,
              ]
              const newTableDisplayConfiguration =
                createUpdatedTableDisplayConfiguration({
                  columnConfiguration: newColumnConfig,
                })
              setTableDisplayConfiguration(
                networkId,
                newTableDisplayConfiguration,
              )
              setNetworkModified(networkId, true)

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
      {selectedRowToolbar}
    </Box>
  )

  const isContextCellVirtual =
    contextMenu !== null &&
    allColumns[contextMenu.cell[0]] &&
    (allColumns[contextMenu.cell[0]] as any).isVirtual === true

  const dataEditorTheme = {
    bgHeader: theme.palette.background.default,
    bgHeaderHovered: theme.palette.action.hover,
    bgHeaderHasFocus: theme.palette.action.focus,
    textHeader: theme.palette.text.primary,
    textHeaderSelected: theme.palette.primary.contrastText,
    bgIconHeader: theme.palette.text.disabled,
    fgIconHeader: theme.palette.background.default,
    bgCell: theme.palette.background.paper,
    bgCellMedium: theme.palette.background.paper,
    bgCellLight: theme.palette.background.paper,
    accentColor: theme.palette.primary.main,
    accentLight: theme.palette.action.selected,
    textDark: theme.palette.text.secondary,
    textMedium: theme.palette.text.disabled,
    textLight: theme.palette.text.disabled,
    borderColor: theme.palette.divider,
  }

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
        <Tabs
          data-testid="table-browser-tabs"
          value={currentTabIndex}
          onChange={handleChange}
          aria-label="tabs"
          sx={{
            height: TABS_HEIGHT,
            minHeight: TABS_HEIGHT,
            '& button': {
              minHeight: TABS_HEIGHT,
              height: TABS_HEIGHT,
              width: 200, // Reverting to original width as it fits better with counts
            },
          }}
        >
          <Tab
            data-testid="table-browser-nodes-tab"
            label={
              <Tooltip
                title={
                  selectedNodes.length > 0
                    ? `The table is showing ${selectedNodes.length} selected nodes. Deselect all nodes in the network view to show the complete list of nodes.`
                    : 'The table is showing all nodes in the network. Select one or more nodes in the network to filter this table.'
                }
              >
                <>
                  Nodes
                  {selectedNodes.length > 0 ? ` (${selectedNodes.length})` : ''}
                </>
              </Tooltip>
            }
          />
          <Tab
            data-testid="table-browser-edges-tab"
            label={
              <Tooltip
                title={
                  selectedEdges.length > 0
                    ? `The table is showing ${selectedEdges.length} selected edges. Deselect all edges in the network view to show the complete list of edges.`
                    : 'The table is showing all edges in the network. Select one or more edges in the network to filter this table.'
                }
              >
                <>
                  Edges
                  {selectedEdges.length > 0 ? ` (${selectedEdges.length})` : ''}
                </>
              </Tooltip>
            }
          />
          <Tab data-testid="table-browser-network-tab" label="Network" />
        </Tabs>
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
        <DataEditor
          data-testid="table-browser-node-editor"
          ref={nodeDataEditorRef}
          gridSelection={selection}
          onGridSelectionChange={onGridSelectionChange}
          rowSelectionBlending="mixed"
          rangeSelectionBlending="mixed"
          columnSelectionBlending="mixed"
          rangeSelect="rect"
          rowSelect={'multi'}
          rowMarkers={'checkbox'}
          rowMarkerWidth={35}
          rowMarkerStartIndex={minNodeId}
          onCellContextMenu={onCellContextMenu}
          onPaste={onPaste}
          getCellsForSelection={true}
          onColumnMoved={onColMoved}
          onItemHovered={(e) => onItemHovered(e.location)}
          overscrollX={10}
          overscrollY={10}
          onColumnResizeEnd={onColumnResize}
          width={width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={maxNodeId - minNodeId + 1}
          theme={dataEditorTheme}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        {tableBrowserToolbar}
        <DataEditor
          data-testid="table-browser-edge-editor"
          ref={edgeDataEditorRef}
          gridSelection={selection}
          onGridSelectionChange={onGridSelectionChange}
          rowSelectionBlending="mixed"
          rangeSelectionBlending="mixed"
          columnSelectionBlending="mixed"
          rangeSelect="rect"
          rowSelect={'multi'}
          rowMarkers={'checkbox'}
          rowMarkerWidth={35}
          rowMarkerStartIndex={minEdgeId}
          onCellContextMenu={onCellContextMenu}
          onPaste={onPaste}
          getCellsForSelection={true}
          onColumnMoved={onColMoved}
          onItemHovered={(e) => onItemHovered(e.location)}
          overscrollX={10}
          overscrollY={10}
          onColumnResizeEnd={onColumnResize}
          width={width}
          height={props.height - GRID_GAP}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={allColumns}
          rows={maxEdgeId - minEdgeId + 1}
          theme={dataEditorTheme}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={2}>
        <NetworkInfoPanel height={props.height - TOOLBAR_HEIGHT - 1} />
      </TabPanel>
      <Menu
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
              disabled={isContextCellVirtual}
              onClick={() => {
                if (contextMenu === null) return
                const [columnIndex, rowIndex] = contextMenu.cell
                const rowData = rows?.[rowIndex]
                const column = allColumns?.[columnIndex]
                const columnKey = column.id
                const cellValue = (rowData as any)?.[columnKey]
                const cellEdits: CellEdit[] = []
                const prevColumnValues: CellEdit[] = []
                Array.from(currentTable.rows.entries()).map(([k, v]) => {
                  cellEdits.push({
                    row: k,
                    column: columnKey,
                    value: cellValue,
                  })
                  prevColumnValues.push({
                    row: k,
                    column: columnKey,
                    value: (v as any)?.[columnKey] as ValueType,
                  })
                })
                postEdit(
                  UndoCommandType.APPLY_VALUE_TO_COLUMN,
                  'Apply value to column',
                  [
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    prevColumnValues,
                  ],
                  [
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    cellEdits,
                  ],
                )
                applyValueToElemenets(
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                  cellValue,
                  undefined,
                )
                setNetworkModified(networkId, true)
                handleContextMenuClose()
              }}
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
              disabled={isContextCellVirtual}
              onClick={() => {
                if (contextMenu === null) return
                const [columnIndex, rowIndex] = contextMenu.cell
                const rowData = rows?.[rowIndex]
                const column = allColumns?.[columnIndex]
                const columnKey = column.id
                const cellValue = (rowData as any)?.[columnKey]
                const cellEdits: CellEdit[] = []
                const prevColumnValues: CellEdit[] = []
                rows.forEach((r) => {
                  const rowId = r.id
                  cellEdits.push({
                    row: rowId,
                    column: columnKey,
                    value: cellValue,
                  })
                  prevColumnValues.push({
                    row: rowId,
                    column: columnKey,
                    value: (r as any)?.[columnKey] as ValueType,
                  })
                })
                postEdit(
                  UndoCommandType.APPLY_VALUE_TO_SELECTED,
                  'Apply value to selected elements',
                  [
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    prevColumnValues,
                  ],
                  [
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    cellEdits,
                  ],
                )
                applyValueToElemenets(
                  props.currentNetworkId,
                  currentTable === nodeTable ? 'node' : 'edge',
                  columnKey,
                  cellValue,
                  rows.map((r) => r.id),
                )
                setNetworkModified(networkId, true)
                handleContextMenuClose()
              }}
            >
              Apply to selected {currentTable === nodeTable ? 'nodes' : 'edges'}
            </MenuItem>
          </span>
        </Tooltip>

        <Divider />

        <MenuItem
          onClick={() => {
            if (contextMenu === null) return
            const [columnIndex, rowIndex] = contextMenu.cell
            const rowData = rows?.[rowIndex]
            const column = allColumns?.[columnIndex]
            const columnKey = column.id
            const cellValue = (rowData as any)?.[columnKey]
            navigator.clipboard.writeText(String(cellValue ?? ''))
            handleContextMenuClose()
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            const activeRef =
              currentTable === nodeTable ? nodeDataEditorRef : edgeDataEditorRef
            // emit paste assumes the grid has focus or the browser permits it.
            // Note: Users may need to Ctrl+V instead if browser blocks programmatic paste.
            activeRef.current?.emit('paste').catch(() => {
              console.warn(
                'Programmatic paste blocked by browser. Please use Ctrl+V.',
              )
            })
            handleContextMenuClose()
          }}
        >
          <ListItemIcon>
            <ContentPaste fontSize="small" />
          </ListItemIcon>
          <ListItemText>Paste</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={selection.current === undefined}
          onClick={() => {
            const activeRef =
              currentTable === nodeTable ? nodeDataEditorRef : edgeDataEditorRef
            activeRef.current?.emit('copy')
            handleContextMenuClose()
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Selected</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            if (contextMenu === null) return
            const [, rowIndex] = contextMenu.cell
            const rowData = rows?.[rowIndex]
            if (rowData?.id != null) {
              if (currentTable === nodeTable) {
                exclusiveSelect(props.currentNetworkId, [rowData.id], [])
              } else {
                exclusiveSelect(props.currentNetworkId, [], [rowData.id])
              }
            }
            handleContextMenuClose()
          }}
        >
          {`Select This ${currentTable === nodeTable ? 'Node' : 'Edge'} in Viewport`}
        </MenuItem>

        <MenuItem
          disabled={
            selection.rows.length === 0 && selection.current === undefined
          }
          onClick={() => {
            const rowsToSelect = new Set(selection.rows.toArray())

            if (selection.current) {
              const ranges =
                selection.current.rangeStack.length > 0
                  ? selection.current.rangeStack
                  : [selection.current.range]

              ranges.forEach((range) => {
                for (let r = range.y; r < range.y + range.height; r++) {
                  rowsToSelect.add(r)
                }
              })
            }

            const rowIds = Array.from(rowsToSelect)
              .map((r) => rows?.[r]?.id)
              .filter((id) => id !== undefined)
            if (currentTable === nodeTable) {
              exclusiveSelect(props.currentNetworkId, rowIds as string[], [])
            } else {
              exclusiveSelect(props.currentNetworkId, [], rowIds as string[])
            }
            setSelection({
              ...selection,
              rows: CompactSelection.empty(),
            })
            handleContextMenuClose()
          }}
        >
          <ListItemIcon>
            <CheckBoxOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            {`Select ${currentTable === nodeTable ? 'nodes' : 'edges'} from selection`}
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
