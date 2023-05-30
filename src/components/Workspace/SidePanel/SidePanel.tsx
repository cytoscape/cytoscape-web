import { Tab, Tabs } from '@mui/material'
import React, { SyntheticEvent } from 'react'

interface SidePanelProps {
  tabContents: JSX.Element[]
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
      sx={{ paddingLeft: '2em' }}
    >
      {tabContents.map((tabContent, index) => (
        <Tab key={index} label={tabContent.props.label} />
      ))}
      <Tab label="Item One" />
    </Tabs>
  )
}
