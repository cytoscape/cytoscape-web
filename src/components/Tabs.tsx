import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

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

export default function BasicTabs(): React.ReactElement {
  const [value, setValue] = React.useState(0)

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: number,
  ): void => {
    setValue(newValue)
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
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab sx={{ width: '300px' }} label="Nodes" {...a11yProps(0)} />
          <Tab sx={{ width: '300px' }} label="Edges" {...a11yProps(1)} />
        </Tabs>
        <KeyboardArrowUpIcon />
      </Box>
      <TabPanel value={value} index={0}>
        Nodes
      </TabPanel>
      <TabPanel value={value} index={1}>
        Edges
      </TabPanel>
    </Box>
  )
}
