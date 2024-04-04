import { Box, Container, Tab, Tabs } from '@mui/material'
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
    <Container
      disableGutters={true}
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
      }}
    >
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ margin: 0, paddingLeft: '2em' }}
      >
        {tabContents.map((tabContent, index) => (
          <Tab key={index} label={tabContent.props.label} />
        ))}
      </Tabs>
      <Box
        sx={{
          width: '100%',
          flexGrow: 1,
        }}
      >
        {tabContents}
      </Box>
    </Container>
  )
}
