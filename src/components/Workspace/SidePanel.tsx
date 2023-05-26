import { Tab, Tabs } from '@mui/material'
import React, { SyntheticEvent } from 'react'

interface SidePanelProps {
  tabContents: React.ReactNode[]
}

export const SidePanel = ({ tabContents }: SidePanelProps): JSX.Element => {
  const [value, setValue] = React.useState(0)

  const handleChange = (event: SyntheticEvent, newValue: number): void => {
    setValue(newValue)
  }

  return (
    <Tabs
      value={value}
      onChange={handleChange}
      variant="scrollable"
      scrollButtons="auto"
      aria-label="scrollable auto tabs example"
    >
      <Tab label="Item One" />
      <Tab label="Item Two" />
      <Tab label="Item Three" />
      <Tab label="Item Four" />
      <Tab label="Item Five" />
      <Tab label="Item Six" />
      <Tab label="Item Seven" />
    </Tabs>
  )
}
