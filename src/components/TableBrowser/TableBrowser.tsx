import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import Card from '@mui/material/Card'
import { Button, MenuItem } from '@mui/material'

import { Table, ValueType, ValueTypeName } from '../../models/TableModel'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { IdType } from '../../models/IdType'

import {
  DataEditor,
  GridCellKind,
  GridCell,
  EditableGridCell,
  Item,
  Rectangle,
  CellClickedEventArgs
} from '@glideapps/glide-data-grid'

import {
  deserializeValueList,
  valueDisplay,
  isListType,
  SortDirection,
  SortType,
  sortFnToType,
} from '../../models/TableModel/impl/ValueTypeImpl'
import TableBrowserContextMenu from './TableBrowserContextMenu'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
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

const getCellKind = (type: ValueTypeName): GridCellKind => {
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
  const [menu, setMenu] = React.useState<
    | {
      col: number
      bounds: Rectangle
      menuType: 'header' | 'cell'
    }
    | undefined
  >(undefined)
  const [showSearch, setShowSearch] = React.useState(false)
  const onSearchClose = React.useCallback(() => setShowSearch(false), [])
  const [sort, setSort] = React.useState<SortType>({
    column: undefined,
    direction: undefined,
    valueType: undefined,
  })


  const networkId = props.currentNetworkId
  const { selectedNodes, selectedEdges } =
    useViewModelStore((state) => state.viewModels[networkId]) ?? {}
  const setCellValue = useTableStore((state) => state.setValue)
  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const duplicateColumn = useTableStore((state) => state.duplicateColumn)
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
    ([key, col], index) => ({
      id: key,
      title: key,
      type: col.type,
      index,
      hasMenu: true,
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

  const onCellContextMenu = React.useCallback((cell: Item, event: CellClickedEventArgs): void => {
    console.log(event)

    event.preventDefault()
    console.log(event.bounds)
    setMenu({
      bounds: event.bounds,
      col: 0,
      menuType: 'header',
    })
  }, [props.currentNetworkId, currentTable, tables])

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [columnIndex, rowIndex] = cell
      const rowData = rows?.[rowIndex]
      const cxId = rowData?.id
      const column = columns?.[columnIndex]
      const columnKey = column.id
      let data = newValue.data

      if (rowData == null || cxId == null || column == null || data == null) return

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
    [props.currentNetworkId, currentTable, tables, sort],
  )

  const onHeaderMenuClick = React.useCallback(
    (col: number, bounds: Rectangle): void => {
      setMenu({
        bounds,
        col,
        menuType: 'header',
      })
    },
    [],
  )

  const onHeaderClicked = React.useCallback((): void => {
    // eslint-disable-next-line no-console
    console.log('Header clicked')
  }, [])

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
        <Button onClick={() => setShowSearch(!showSearch)}>
          Toggle Search
        </Button>
        <Box>
          <DataEditor
            onCellContextMenu={onCellContextMenu}
            rowMarkers={'both'}
            rowMarkerStartIndex={minNodeId}
            showSearch={showSearch}
            keybindings={{ search: true }}
            onPaste={true}
            getCellsForSelection={true}
            onSearchClose={onSearchClose}
            onHeaderMenuClick={onHeaderMenuClick}
            onHeaderClicked={onHeaderClicked}
            onItemHovered={(e) => onItemHovered(e.location)}
            width={props.width}
            height={props.height}
            getCellContent={getContent}
            onCellEdited={onCellEdited}
            columns={columns}
            rows={maxNodeId - minNodeId}
          />
        </Box>
        {menu != null && menu.menuType === 'header' && <TableBrowserContextMenu bounds={menu.bounds}>
          <Card
            sx={{
              backgroundColor: 'white',
              width: 175,
              zIndex: 100,
            }}
            onClick={() => setMenu(undefined)}
          >
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type

                  setSort({
                    column: columnKey,
                    direction: 'asc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort ascending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type
                  setSort({
                    column: columnKey,
                    direction: 'desc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort descending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                }
                setMenu(undefined)
              }}
            >
              Duplicate column
            </MenuItem>
          </Card>
        </TableBrowserContextMenu>}
        {menu != null && menu.menuType === 'cell' && <TableBrowserContextMenu bounds={menu.bounds}>
          <Card
            sx={{
              backgroundColor: 'white',
              width: 175,
              zIndex: 100,
            }}
            onClick={() => setMenu(undefined)}
          >
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type

                  setSort({
                    column: columnKey,
                    direction: 'asc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort ascending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type
                  setSort({
                    column: columnKey,
                    direction: 'desc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort descending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                }
                setMenu(undefined)
              }}
            >
              Duplicate column
            </MenuItem>
          </Card>
        </TableBrowserContextMenu>}


      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <Button onClick={() => setShowSearch(!showSearch)}>
          Toggle Search
        </Button>

        <Box>
          <DataEditor
            onCellContextMenu={onCellContextMenu}
            rowMarkers={'both'}
            rowMarkerStartIndex={minEdgeId}
            showSearch={showSearch}
            keybindings={{ search: true }}
            getCellsForSelection={true}
            onPaste={true}
            onSearchClose={onSearchClose}
            onHeaderMenuClick={onHeaderMenuClick}
            onHeaderClicked={onHeaderClicked}
            onItemHovered={(e) => onItemHovered(e.location)}
            width={props.width}
            height={props.height}
            getCellContent={getContent}
            onCellEdited={onCellEdited}
            columns={columns}
            rows={maxEdgeId - minEdgeId}
          />
        </Box>
        {menu != null && menu.menuType === 'header' && <TableBrowserContextMenu bounds={menu.bounds}>
          <Card
            sx={{
              backgroundColor: 'white',
              width: 175,
              zIndex: 100,
            }}
            onClick={() => setMenu(undefined)}
          >
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type

                  setSort({
                    column: columnKey,
                    direction: 'asc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort ascending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type
                  setSort({
                    column: columnKey,
                    direction: 'desc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort descending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                }
                setMenu(undefined)
              }}
            >
              Duplicate column
            </MenuItem>
          </Card>
        </TableBrowserContextMenu>}
        {menu != null && menu.menuType === 'cell' && <TableBrowserContextMenu bounds={menu.bounds}>
          <Card
            sx={{
              backgroundColor: 'white',
              width: 175,
              zIndex: 100,
            }}
            onClick={() => setMenu(undefined)}
          >
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type

                  setSort({
                    column: columnKey,
                    direction: 'asc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort ascending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  const columnType = column.type
                  setSort({
                    column: columnKey,
                    direction: 'desc',
                    valueType: columnType,
                  })
                }
                setMenu(undefined)
              }}
            >
              Sort descending
            </MenuItem>
            <MenuItem
              onClick={() => {
                const col = menu?.col
                if (col != null) {
                  const column = columns[col]
                  const columnKey = column.id
                  duplicateColumn(
                    props.currentNetworkId,
                    currentTable === nodeTable ? 'node' : 'edge',
                    columnKey,
                  )
                }
                setMenu(undefined)
              }}
            >
              Duplicate column
            </MenuItem>
          </Card>
        </TableBrowserContextMenu>}


      </TabPanel>
    </Box>
  )
}
