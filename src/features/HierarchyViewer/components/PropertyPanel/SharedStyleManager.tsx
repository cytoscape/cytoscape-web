import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Theme,
  useTheme,
} from '@mui/material'
import { useEffect, useState } from 'react'

export const SharedStyleManager = (): JSX.Element => {
  // Active network

  const theme: Theme = useTheme()
  const [enable, setEnable] = useState<boolean>(false)
  // const [currentStyle, setCurrentStyle] = useState<VisualStyle>(null)

  const handleChange = (e: any): void => {
    setEnable(e.target.checked)
    // Apply original style
  }

  useEffect(() => {
    console.log('Shared style manager is enabled: ', enable)
  }, [enable])
  return (
    <Box sx={{ padding: theme.spacing(1) }}>
      <FormGroup>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Use shared style"
          onChange={handleChange}
        />
      </FormGroup>
    </Box>
  )
}
