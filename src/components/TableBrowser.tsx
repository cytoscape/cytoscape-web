import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
// import { Button } from '@mui/material'

import { Table } from '../models/TableModel'
import { useTableStore } from '../store/TableStore'
import { IdType } from '../models/IdType'

// import { useTableStore } from '../hooks/useTableStore'
import {
  DataEditor,
  GridCellKind,
  GridCell,
  // EditableGridCell,
  Item,
} from '@glideapps/glide-data-grid'

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number): { id: string; 'aria-controls': string } {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

export default function TableBrowser(props: {
  currentNetworkId: IdType
}): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const networkId = props.currentNetworkId
  const tables: Record<IdType, { nodeTable: Table; edgeTable: Table }> =
    useTableStore((state) => state.tables)
  const nodeTable = tables[networkId]?.nodeTable
  const edgeTable = tables[networkId]?.edgeTable
  const currentTable = currentTabIndex === 0 ? nodeTable : edgeTable
  const columns = Array.from(currentTable?.columns.entries() ?? new Map()).map(
    ([key, value], index) => ({ id: key, title: key, index }),
  )
  // const [showSearch, setShowSearch] = React.useState(false)
  // const onSearchClose = React.useCallback(() => setShowSearch(false), [])

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getContent = React.useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell
      const dataRow = currentTable.rows.get(`${row}`)

      if (dataRow == null) {
        return {
          allowOverlay: true,
          readonly: false,
          kind: GridCellKind.Text,
          displayData: '',
          data: '',
        }
      }

      const colId = columns[col].id
      const colKey = currentTable.aliases.get(colId) ?? colId

      const cellData = String(dataRow[colKey]) ?? ''

      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        displayData: cellData,
        readonly: false,
        data: cellData,
      }
    },
    [props.currentNetworkId, currentTable],
  )

  // const onCellEdited = React.useCallback(
  //   (cell: Item, newValue: EditableGridCell) => {
  //     if (newValue.kind !== GridCellKind.Text) {
  //       // we only have text cells, might as well just die here.
  //       return
  //     }

  //     const indexes: Array<keyof TableDataRow> = [
  //       'attributeA',
  //       'attributeB',
  //       'attributeC',
  //     ]
  //     const [col, row] = cell
  //     const key = indexes[col]
  //     setCellValue(newValue.data, row, key)
  //   },
  //   [rows, columns],
  // )

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
          <Tab
            label={<Typography variant="caption">Nodes</Typography>}
            {...a11yProps(0)}
          />
          <Tab
            label={<Typography variant="caption">Edges</Typography>}
            {...a11yProps(1)}
          />
        </Tabs>
        <KeyboardArrowUpIcon sx={{ color: 'white' }} />
      </Box>
      <TabPanel value={currentTabIndex} index={0}>
        <DataEditor
          rowMarkers={'both'}
          // showSearch={showSearch}
          keybindings={{ search: true }}
          getCellsForSelection={true}
          // onSearchClose={onSearchClose}
          width={1200}
          height={400}
          getCellContent={getContent}
          // onCellEdited={onCellEdited}
          columns={columns}
          rows={currentTable?.rows.size}
        />
        {/* )} */}
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <DataEditor
          rowMarkers={'both'}
          // showSearch={showSearch}
          keybindings={{ search: true }}
          getCellsForSelection={true}
          // onSearchClose={onSearchClose}
          width={1200}
          height={400}
          getCellContent={getContent}
          // onCellEdited={onCellEdited}
          columns={columns}
          rows={currentTable?.rows.size}
        />
      </TabPanel>
    </Box>
  )
}
