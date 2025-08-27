import * as React from 'react'
import Box from '@mui/material/Box'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export function TabPanel(props: TabPanelProps): React.ReactElement {
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
