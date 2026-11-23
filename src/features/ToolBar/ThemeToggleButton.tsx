import CheckIcon from '@mui/icons-material/Check'
import ContrastIcon from '@mui/icons-material/Contrast'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { ReactElement, useState } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeModeOption {
  mode: ThemeMode
  label: string
  Icon: typeof ContrastIcon
}

// Menu order: System first, since it is the default and the way back (#850).
const THEME_MODE_OPTIONS: readonly ThemeModeOption[] = [
  { mode: 'system', label: 'System', Icon: ContrastIcon },
  { mode: 'light', label: 'Light', Icon: LightModeIcon },
  { mode: 'dark', label: 'Dark', Icon: DarkModeIcon },
]

/**
 * Toolbar button that picks the color mode: follow the operating system,
 * or always light, or always dark. The button shows the chosen mode's icon;
 * a click opens a menu of the three. MUI's CssVarsProvider (`App.tsx`)
 * persists the choice in localStorage (`mui-mode`).
 */
export const ThemeToggleButton = (): ReactElement | null => {
  const { mode, setMode } = useColorScheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // Undefined until the provider has read the stored mode on mount.
  if (!mode) {
    return null
  }

  const current =
    THEME_MODE_OPTIONS.find((option) => option.mode === mode) ??
    THEME_MODE_OPTIONS[0]
  const label = `Appearance: ${current.label}`
  const open = anchorEl !== null

  const handleSelect = (next: ThemeMode): void => {
    setMode(next)
    setAnchorEl(null)
  }

  return (
    <>
      <Tooltip title={open ? '' : label}>
        <IconButton
          data-testid="theme-mode-button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? 'theme-mode-menu' : undefined}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ color: 'white', ml: 0.5, mr: 0.5 }}
        >
          <current.Icon />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-mode-menu"
        data-testid="theme-mode-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {THEME_MODE_OPTIONS.map(({ mode: optionMode, label, Icon }) => (
          <MenuItem
            key={optionMode}
            data-testid={`theme-mode-${optionMode}`}
            role="menuitemradio"
            aria-checked={optionMode === current.mode}
            selected={optionMode === current.mode}
            onClick={() => handleSelect(optionMode)}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {/* Trailing checkmark: the selected-row tint alone is too faint.
                Unchecked rows keep the slot empty so the labels line up. */}
            <ListItemIcon sx={{ minWidth: 0, ml: 2, width: 20 }}>
              {optionMode === current.mode && <CheckIcon fontSize="small" />}
            </ListItemIcon>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
