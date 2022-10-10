import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

import { Table } from '../models/Table'

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

interface TableBrowserProps {
  edgeTable: Table
  nodeTable: Table
}

export default function TableBrowser(
  props: TableBrowserProps,
): React.ReactElement {
  const [currentTabIndex, setCurrentTabIndex] = React.useState(0)

  const { nodeTable, edgeTable } = props

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setCurrentTabIndex(newValue)
  }

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
        <div>Nodes</div>
        {JSON.stringify(nodeTable, null, 2)}
      </TabPanel>
      <TabPanel value={currentTabIndex} index={1}>
        <div>Edges</div>
        {JSON.stringify(edgeTable, null, 2)}
      </TabPanel>
    </Box>
  )
}
