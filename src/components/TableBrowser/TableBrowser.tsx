import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Button, ButtonGroup } from '@mui/material'

import { Table, ValueType, ValueTypeName } from '../../models/TableModel'
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
} from '@glideapps/glide-data-grid'

import {
  deserializeValueList,
  valueDisplay,
  isListType,
  SortDirection,
  SortType,
  sortFnToType,
  serializedStringIsValid,
  deserializeValue,
} from '../../models/TableModel/impl/ValueTypeImpl'

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
}

function TabPanel(props: TabPanelProps): React.ReactElement {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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
  height: number // current height of the panel that contains the table browser -- needed to sync to the dataeditor
  width: number // current width of the panel that contains the table browser -- needed to sync to the dataeditor
}): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
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

  const [selectedColumnIndex, setSelectedColumnIndex] = React.useState<
    number | undefined
  >(undefined)

  const [selectedCellXY, setSelectedCellXY] = React.useState<
    [number, number] | undefined
  >(undefined)

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

  const { selectedNodes, selectedEdges } =
    useViewModelStore((state) => state.viewModels[networkId]) ?? {}
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
  const columns = Array.from(currentTable?.columns.entries() ?? new Map()).map(
    ([attributeName, col], index) => ({
      id: attributeName,
      title: attributeName,
      type: col.type,
      index,
    }),
  )

  const selectedElements = currentTabIndex === 0 ? selectedNodes : selectedEdges
  const selectedElementsSet = new Set(selectedElements)
  const rowsWithIds = Array.from(
    (currentTable?.rows ?? new Map()).entries(),
  ).map(([key, value]) => ({ ...value, id: key }))
  const rows =
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
    const sortFn = sortFnToType[sort.valueType]
    rows.sort((a, b) => {
      if (a == null || b == null || sort.column == null) return 0
      const aVal = (a as Record<string, ValueType>)[sort.column]
      const bVal = (b as Record<string, ValueType>)[sort.column]
      return sortFn(aVal, bVal, sort.direction as SortDirection)
    })
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
    [props.currentNetworkId, rows, currentTable, tables, sort],
  )

  const onItemHovered = React.useCallback(
    (cell: Item) => {
      const rowIndex = cell[1]
      const rowData = rows[rowIndex]
      const cxId = rowData?.id

      if (cxId != null) {
        // TODO this operation is too expensive for large networks
        // // const eleId = isNodeTable ? `${cxId}` : translateCXEdgeId(`${cxId}`)
        // // console.log(eleId)
        // setHovered(props.currentNetworkId, String(cxId))
      }
    },
    [props.currentNetworkId, currentTable, tables],
  )

  const onCellContextMenu = React.useCallback(
    (cell: Item, event: CellClickedEventArgs): void => {
      console.log(event)

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
      setSelectedColumnIndex(col)
      setSelectedCellXY(undefined)
      console.log(selectedColumnIndex)
    },
    [],
  )

  const onCellClicked = React.useCallback(
    (cell: Item): void => {
      setSelectedCellXY(cell as [number, number])
      setSelectedColumnIndex(undefined)
    },
    [props.currentNetworkId, rows, currentTable, tables, sort],
  )

  const selectedColumn =
    selectedColumnIndex != null ? columns?.[selectedColumnIndex] : null
  // scan the visual properties to see if the selected column name is used in any mappings
  const visualPropertiesDependentOnSelectedColumn = Object.values(
    visualStyle ?? {},
  )
    .filter(
      (vpValue) =>
        selectedColumn?.id != null &&
        vpValue?.mapping?.attribute === selectedColumn.id,
    )
    .map((vp) => vp.displayName)
  const selectedColumnToolbar =
    selectedColumn != null ? (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
            mb: 2,
            bgColor: '#d9d9d9',
          }}
        >
          <Box sx={{ mr: 1 }}>Selected Column: {selectedColumn.id}</Box>
          <ButtonGroup size="small">
            <Button
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
              Sort Asc.
            </Button>
            <Button
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
              {' '}
              Sort Desc.
            </Button>
            <Button
              onClick={() => {
                if (selectedColumn != null) {
                  const columnKey = selectedColumn.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                }
              }}
            >
              Duplicate Column
            </Button>
            <Button onClick={() => setShowEditColumnForm(true)}>
              Rename Column
            </Button>
            <Button color="error" onClick={() => setShowDeleteColumnForm(true)}>
              Delete Column
            </Button>
          </ButtonGroup>
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
          onSubmit={(newColumnName: string) => {
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
              setColumnFormError(undefined)
              setSelectedColumnIndex(undefined)
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
          onSubmit={() => {
            deleteColumn(
              props.currentNetworkId,
              currentTable === nodeTable ? 'node' : 'edge',
              selectedColumn.id,
            )
            setDeleteColumnFormError(undefined)
            setSelectedColumnIndex(undefined)
          }}
        />
      </>
    ) : null

  const selectedCell = selectedCellXY
  const selectedCellToolbar =
    selectedCell != null ? (
      <>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
            mb: 2,
            bgColor: '#d9d9d9',
          }}
        >
          <Box sx={{ mr: 1 }}>Selected cell actions</Box>
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
              Apply value to selected nodes
            </Button>
          </ButtonGroup>
        </Box>
      </>
    ) : null

  const tableBrowserToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Button sx={{ mr: 1 }} onClick={() => setShowSearch(!showSearch)}>
        Search
      </Button>
      <Button sx={{ mr: 1 }} onClick={() => setShowCreateColumnForm(true)}>
        Create Column
      </Button>
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
              console.log(dataType, value)
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
              setSelectedColumnIndex(undefined)
              setCreateColumnFormError(undefined)
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
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#2F80ED',
          height: 28,
        }}
      >
        <Tabs
          value={currentTabIndex}
          onChange={handleChange}
          aria-label="tabs"
          TabIndicatorProps={{ sx: { backgroundColor: 'white' } }}
          sx={{
            fontSize: 10,
            '& button.Mui-selected': { color: 'white' },
            '& button': {
              minHeight: 30,
              height: 30,
              width: 300,
            },
            height: 30,
            minHeight: 30,
          }}
        >
          <Tab label={<Typography variant="caption">Nodes</Typography>} />
          <Tab label={<Typography variant="caption">Edges</Typography>} />
        </Tabs>
        <KeyboardArrowUpIcon sx={{ color: 'white' }} />
      </Box>
      <TabPanel value={currentTabIndex} index={0}>
        {tableBrowserToolbar}
        <Box>
          <DataEditor
            ref={nodeDataEditorRef}
            onCellClicked={onCellClicked}
            onCellContextMenu={onCellContextMenu}
            rowMarkers={'checkbox'}
            rowMarkerStartIndex={minNodeId}
            showSearch={showSearch}
            keybindings={{ search: true }}
            onPaste={true}
            getCellsForSelection={true}
            onSearchClose={onSearchClose}
            onHeaderClicked={onHeaderClicked}
            onItemHovered={(e) => onItemHovered(e.location)}
            width={props.width}
            height={props.height}
            getCellContent={getContent}
            onCellEdited={onCellEdited}
            columns={columns}
            rows={maxNodeId - minNodeId + 1}
          />
        </Box>
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        {tableBrowserToolbar}
        <Box>
          <DataEditor
            ref={edgeDataEditorRef}
            onCellClicked={onCellClicked}
            onCellContextMenu={onCellContextMenu}
            rowMarkers={'checkbox'}
            rowMarkerStartIndex={minEdgeId}
            showSearch={showSearch}
            keybindings={{ search: true }}
            getCellsForSelection={true}
            onPaste={true}
            onSearchClose={onSearchClose}
            onHeaderClicked={onHeaderClicked}
            onItemHovered={(e) => onItemHovered(e.location)}
            width={props.width}
            height={props.height}
            getCellContent={getContent}
            onCellEdited={onCellEdited}
            columns={columns}
            rows={maxEdgeId - minEdgeId + 1}
          />
        </Box>
      </TabPanel>
    </Box>
  )
}
