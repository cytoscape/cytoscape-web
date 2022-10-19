import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

import {
  DataEditor,
  GridCellKind,
  GridCell,
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

  const { tableData } = props
  console.log(tableData)

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

  const getData = React.useCallback((cell: Item): GridCell => {
    const [col, row] = cell
    const dataRow = tableData.rows[row]

    const indexes: Array<keyof TableDataRow> = [
      'attributeA',
      'attributeB',
      'attributeC',
    ]
    const d = dataRow[indexes[col]]

    return {
      kind: GridCellKind.Text,
      allowOverlay: false,
      displayData: d,
      data: d,
    }
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
          width={1200}
          height={400}
          getCellContent={getData}
          columns={tableData.columns}
          rows={tableData.rows.length}
        />
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <div>Edges</div>
      </TabPanel>
    </Box>
  )
}
