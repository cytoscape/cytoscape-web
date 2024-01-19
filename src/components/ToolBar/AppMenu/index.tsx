import { useState } from 'react'
import { AppDefinition, AppType } from './AppDefinition'
import {
  ListItemIcon,
  ListItemText,
  Button,
  Menu,
  MenuItem,
} from '@mui/material'
import { DropdownMenuProps } from '../DropdownMenuProps'

export const EXAMPLE_CONFIG: AppDefinition[] = [
  // Add your AppDefinition objects here
  {
    type: AppType.Service,
    url: 'https://example.com',
  },
  {
    type: AppType.Service,
    url: 'https://google.com',
  },
]

export const AppMenu = ({ label }: DropdownMenuProps): JSX.Element => {
  // For open the main menu with the Button
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseDropdownMenu = (): void => {
    setAnchorEl(null)
  }

  return (
    <>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={label}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenDropdownMenu}
      >
        {label}
      </Button>

      <Menu
        id="app-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        keepMounted
        onClose={handleCloseDropdownMenu}
        onMouseLeave={handleCloseDropdownMenu}
      >
        {EXAMPLE_CONFIG.map((app, index) => (
          <MenuItem key={index} onClick={handleCloseDropdownMenu}>
            <ListItemIcon>{/* Add your icon here */}</ListItemIcon>
            <ListItemText primary={app.url} />
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
