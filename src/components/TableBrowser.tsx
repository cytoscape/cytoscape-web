import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Button } from '@mui/material'

import { useModelTableStore } from '../hooks/useModelTableStore'
import {
  DataEditor,
  GridCellKind,
  GridCell,
  EditableGridCell,
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

interface TableDataRow {
  attributeA: string
  attributeB: string
  attributeC: string
}
export default function TableBrowser(props: any): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)
  const [showSearch, setShowSearch] = React.useState(false)
  const onSearchClose = React.useCallback(() => setShowSearch(false), [])

  const { table, derivedColumns, loadDemoTable, setCellValue } =
    useModelTableStore((state) => ({
      table: state.table,
      derivedColumns: state.derivedColumns,
      loadDemoTable: state.loadDemoTable,
      setCellValue: state.setCellValue,
    }))

  const loadTable = async (): Promise<void> => {
    await loadDemoTable()
  }

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getContent = React.useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell
      const dataRow = table.rows[row]

      if (dataRow == null) {
        return {
          allowOverlay: true,
          readonly: false,
          kind: GridCellKind.Text,
          displayData: '',
          data: '',
        }
      }

      const indexes = derivedColumns.map((c) => c.id)

      const d = dataRow.data[indexes[col]] as string

      const strData = Array.isArray(d) ? d.join(', ') : `${d}`

      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        displayData: strData,
        readonly: false,
        data: strData,
      }
    },
    [table.rows, derivedColumns],
  )

  const onCellEdited = React.useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) {
        // we only have text cells, might as well just die here.
        return
      }

      const indexes: Array<keyof TableDataRow> = [
        'attributeA',
        'attributeB',
        'attributeC',
      ]
      const [col, row] = cell
      const key = indexes[col]
      setCellValue(newValue.data, row, key)
    },
    [table.rows, derivedColumns],
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
        <Button onClick={() => loadTable()}>
          Load NDEx Network Table (editing not implemented yet)
        </Button>

        <Button onClick={() => setShowSearch(!showSearch)}>
          Toggle Search
        </Button>

        {table.rows.length > 0 && derivedColumns.length > 0 && (
          <DataEditor
            rowMarkers={'both'}
            showSearch={showSearch}
            keybindings={{ search: true }}
            getCellsForSelection={true}
            onSearchClose={onSearchClose}
            width={1200}
            height={400}
            getCellContent={getContent}
            onCellEdited={onCellEdited}
            columns={derivedColumns}
            rows={table.rows.length}
          />
        )}
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <div>Edges</div>
      </TabPanel>
    </Box>
  )
}
