import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import * as React from 'react'

export const ThemeToggleButton = (): React.ReactElement | null => {
  const { mode, setMode, systemMode } = useColorScheme()

  if (!mode) {
    return null
  }

  const currentMode = mode === 'system' ? systemMode : mode
  const isDark = currentMode === 'dark'

  return (
    <Tooltip title={`Turn on ${isDark ? 'light' : 'dark'} mode`}>
      <IconButton
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        sx={{ color: 'white', ml: 0.5, mr: 0.5 }}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
