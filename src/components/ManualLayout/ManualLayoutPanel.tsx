import { Box, Theme, useTheme } from '@mui/material'
import { Scaling } from './Scaling'

/**
 * React component for manual layout UI.
 *
 */
export const ManualLayoutPanel = (): JSX.Element => {
  const theme: Theme = useTheme()

  return (
    <Box sx={{ width: '100%', height: '100%', padding: theme.spacing(1) }}>
      <Scaling />
    </Box>
  )
}
