/**
 * React component for selecting Visual Styles
 */

import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Theme,
  Typography,
  useTheme,
} from '@mui/material'

export const StyleManager = (): JSX.Element => {
  const theme: Theme = useTheme()
  return (
    <Box sx={{ padding: theme.spacing(1) }}>
      <Typography variant={'subtitle1'}>Visual Styles</Typography>
      <FormGroup>
        <FormControlLabel
          control={<Switch disabled defaultChecked />}
          label="Use shared style"
        />
      </FormGroup>
    </Box>
  )
}
