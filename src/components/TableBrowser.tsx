import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import Card from '@mui/material/Card'
import { Button, MenuItem } from '@mui/material'
import { useLayer } from 'react-laag'

import {
  Table,
  ValueType,
  ValueTypeName,
  AttributeName,
} from '../models/TableModel'
import { useTableStore } from '../store/TableStore'
import { IdType } from '../models/IdType'

import {
  DataEditor,
  GridCellKind,
  GridCell,
  EditableGridCell,
  Item,
  Rectangle,
} from '@glideapps/glide-data-grid'
import { translateCXEdgeId } from '../models/NetworkModel/impl/CyNetwork'
import {
  ListOfValueType,
  SingleValueType,
} from '../models/TableModel/ValueType'

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

// serialize lists of different value types into a string to display in the table
// e.g. [1, 2, 3] -> '1, 2, 3'
const serializeValueList = (value: ListOfValueType): string => {
  return value.map((v) => String(v)).join(', ')
}

// deserialize a string into a list of value types
// e.g. '1, 2, 3' -> [1, 2, 3]
const deserializeValueList = (
  type: ValueTypeName,
  value: string,
): ListOfValueType => {
  const deserializeFnMap: Record<ValueTypeName, (value: string) => ValueType> =
    {
      list_of_string: (value: string) => value.split(', ') as ValueType,
      list_of_long: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      list_of_integer: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      list_of_double: (value: string) =>
        value.split(', ').map((v) => +v) as ValueType,
      list_of_boolean: (value: string) =>
        value.split(', ').map((v) => v === 'true') as ValueType,
      boolean: (value: string) => value === 'true',
      string: (value: string) => value,
      long: (value: string) => +value,
      integer: (value: string) => +value,
      double: (value: string) => +value,
    }

  return deserializeFnMap[type](value) as ListOfValueType
}

const getCellKind = (type: ValueTypeName): GridCellKind => {
  const valueTypeName2CellTypeMap: Record<ValueTypeName, GridCellKind> = {
    string: GridCellKind.Text,
    long: GridCellKind.Number,
    integer: GridCellKind.Number,
    double: GridCellKind.Number,
    boolean: GridCellKind.Boolean,
    list_of_string: GridCellKind.Text,
    list_of_long: GridCellKind.Text,
    list_of_integer: GridCellKind.Text,
    list_of_double: GridCellKind.Text,
    list_of_boolean: GridCellKind.Text,
  }
  return valueTypeName2CellTypeMap[type] ?? GridCellKind.Text
}

// convert list of value type to a string to display in the table
// single value types are supported by the table by default
const valueDisplay = (value: ValueType, type: string): SingleValueType => {
  if (['string', 'long', 'integer', 'double', 'boolean'].includes(type)) {
    return value as SingleValueType
  }

  if (
    [
      'list_of_string',
      'list_of_long',
      'list_of_integer',
      'list_of_double',
      'list_of_boolean',
    ].includes(type)
  ) {
    if (Array.isArray(value)) {
      return serializeValueList(value)
    }
    return value
  }

  return value as SingleValueType
}

const isListType = (type: ValueTypeName): boolean => {
  return [
    'list_of_string',
    'list_of_long',
    'list_of_integer',
    'list_of_double',
    'list_of_boolean',
  ].includes(type)
}

interface SortType {
  column: AttributeName | undefined
  direction: 'asc' | 'desc' | undefined
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
      }
    | undefined
  >(undefined)
  const [showSearch, setShowSearch] = React.useState(false)
  const onSearchClose = React.useCallback(() => setShowSearch(false), [])
  const [sort, setSort] = React.useState<SortType>({
    column: undefined,
    direction: undefined,
  })

  const isOpen = menu !== undefined

  const networkId = props.currentNetworkId
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
      title: `${key}-${col.type}`,
      type: col.type,
      index,
      defaultValue: col.defaultValue,
      hasMenu: true,
    }),
  )

  const rows = Array.from((currentTable?.rows ?? new Map()).values())
  if (sort.column != null && sort.direction != null) {
    rows.sort((a, b) => {
      const aVal = a[sort.column as AttributeName]
      const bVal = b[sort.column as AttributeName]
      if (sort.direction === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal > bVal ? -1 : 1
    })
  }

  const { layerProps, renderLayer } = useLayer({
    isOpen,
    auto: true,
    placement: 'bottom-end',
    triggerOffset: 2,

    // TODO does not work presumably because of multiple render inefficiencies
    // TODO investigate
    // onOutsideClick: () => {
    //   console.log('outside click')
    //   console.log(menu)

    //   setMenu(undefined)
    // },

    trigger: {
      getBounds: () => {
        const bounds = {
          left: menu?.bounds.x ?? 0,
          top: menu?.bounds.y ?? 0,
          width: menu?.bounds.width ?? 0,
          height: menu?.bounds.height ?? 0,
          right: (menu?.bounds.x ?? 0) + (menu?.bounds.width ?? 0),
          bottom: (menu?.bounds.y ?? 0) + (menu?.bounds.height ?? 0),
        }
        return bounds
      },
    },
  })

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getContent = React.useCallback(
    (cell: Item): GridCell => {
      const [columnIndex, rowIndex] = cell
      // const minId = currentTable === nodeTable ? minNodeId : minEdgeId
      // const rowKey =
      //   currentTable === nodeTable
      //     ? +rowIndex + minId
      //     : translateCXEdgeId(`${+rowIndex + minId}`)
      const dataRow = rows[rowIndex]
      const column = columns[columnIndex]
      const columnKey = column.id
      const cellValue = dataRow?.[columnKey] ?? column.defaultValue

      if (dataRow == null || cellValue == null) {
        return {
          allowOverlay: true,
          readonly: false,
          kind: GridCellKind.Text,
          displayData: 'N/A',
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
    [props.currentNetworkId, currentTable, tables, sort],
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      const [columnIndex, rowIndex] = cell
      // const minId = currentTable === nodeTable ? minNodeId : minEdgeId
      // const rowKey =
      //   currentTable === nodeTable
      //     ? +rowIndex + minId
      //     : translateCXEdgeId(`${+rowIndex + minId}`)

      const rowData = rows[rowIndex]
      const rowKey =
        currentTable === nodeTable
          ? +rowData.cxId
          : translateCXEdgeId(`${rowData.cxId as string}`)

      const column = columns[columnIndex]
      const columnKey = column.id
      let data = newValue.data

      if (isListType(column.type)) {
        data = deserializeValueList(column.type, data as string)
      }

      const newDataIsValid = true

      // TODO validate the new data
      if (newDataIsValid) {
        setCellValue(
          props.currentNetworkId,
          currentTable === nodeTable ? 'node' : 'edge',
          `${rowKey}`,
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
          height: 38,
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
        <DataEditor
          rowMarkers={'both'}
          rowMarkerStartIndex={minNodeId}
          showSearch={showSearch}
          keybindings={{ search: true }}
          getCellsForSelection={true}
          onSearchClose={onSearchClose}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderClicked={onHeaderClicked}
          width={props.width}
          height={props.height}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={maxNodeId - minNodeId}
        />
        {isOpen &&
          renderLayer(
            <Card
              sx={{
                backgroundColor: 'white',
                width: 175,
                zIndex: 100,
              }}
              {...layerProps}
            >
              <MenuItem
                onClick={() => {
                  const col = menu?.col
                  if (col != null) {
                    const column = columns[col]
                    const columnKey = column.id
                    setSort({
                      column: columnKey,
                      direction: 'asc',
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
                    setSort({
                      column: columnKey,
                      direction: 'desc',
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
                    // duplicateColumn(col)
                    const column = columns[col]
                    const columnKey = column.id
                    duplicateColumn(
                      props.currentNetworkId,
                      currentTable === nodeTable ? 'node' : 'edge',
                      columnKey,
                    )
                  }
                  // duplicateColumn()
                  setMenu(undefined)
                }}
              >
                Duplicate column
              </MenuItem>
            </Card>,
          )}

        {/* )} */}
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <Button onClick={() => setShowSearch(!showSearch)}>
          Toggle Search
        </Button>

        <DataEditor
          rowMarkers={'both'}
          rowMarkerStartIndex={minEdgeId}
          showSearch={showSearch}
          keybindings={{ search: true }}
          getCellsForSelection={true}
          onSearchClose={onSearchClose}
          onHeaderMenuClick={onHeaderMenuClick}
          onHeaderClicked={onHeaderClicked}
          width={props.width}
          height={props.height}
          getCellContent={getContent}
          onCellEdited={onCellEdited}
          columns={columns}
          rows={maxEdgeId - minEdgeId}
        />
        {isOpen &&
          renderLayer(
            <Card
              sx={{
                backgroundColor: 'white',
                width: 100,
                height: 100,
                zIndex: 10,
              }}
              {...layerProps}
            >
              <MenuItem
                onClick={() => {
                  const col = menu?.col
                  if (col != null) {
                    const column = columns[col]
                    const columnKey = column.id
                    setSort({
                      column: columnKey,
                      direction: 'asc',
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
                    setSort({
                      column: columnKey,
                      direction: 'desc',
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
            </Card>,
          )}
      </TabPanel>
    </Box>
  )
}
