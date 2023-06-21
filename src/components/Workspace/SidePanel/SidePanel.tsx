import { Box, Tab, Tabs } from '@mui/material'
import { SyntheticEvent, useState } from 'react'
import { getTabContents } from './TabContents'

/**
 * The collapsible side panel for extra UI components
 *
 */
export const SidePanel = (): JSX.Element => {
  // Selected tab number
  const [value, setValue] = useState(0)

  const handleChange = (event: SyntheticEvent, newValue: number): void => {
    setValue(newValue)
  }

  const tabContents = getTabContents(value)

  return (
    <>
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
      </Tabs>
      <Box sx={{ width: '100%', height: '90%' }}>{tabContents}</Box>
    </>
  )
}
