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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          p: 0,
          paddingLeft: '2.5em',
          m: 0,
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            display: 'flex',
            alignItems: 'center',
            '& button': {
              height: '2.5em',
              minHeight: '2.5em',
            },
            height: '2.5em',
            minHeight: '2.5em',
            flexGrow: 1,
            margin: 0,
          }}
        >
          {tabContents.map((tabContent, index) => (
            <Tab key={index} label={tabContent.props.label} />
          ))}
        </Tabs>
      </Box>

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
