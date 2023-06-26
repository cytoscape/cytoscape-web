import { Box } from '@mui/material'

interface TabPanelProps {
  children?: JSX.Element
  index: number
  value: number
  label: string
}

export const TabPanel = (props: TabPanelProps): JSX.Element => {
  const { children, value, index, ...other } = props

  if (value !== index) {
    return <></>
  }
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`sidepanel-${index}`}
      aria-labelledby={`sidepanel-${index}`}
      {...other}
      sx={{ width: '100%', height: '100%' }}
    >
      {children}
    </Box>
  )
}
