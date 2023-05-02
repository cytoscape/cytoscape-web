import { Menu, MenuItem } from '@mui/material'
import { NestedMenuItem, IconMenuItem } from 'mui-nested-menu'
import { useState } from 'react'

export const NestedMenu = (): JSX.Element => {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const handleClose = (): void => setAnchorEl(null)

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
      <NestedMenuItem label="Top Level" parentMenuOpen={open}>
        <MenuItem onClick={handleClose}>Standard Menu Item!</MenuItem>
        <IconMenuItem onClick={handleClose} label="Icon Menu Item" />
        <NestedMenuItem label="Go deeper!" parentMenuOpen={open}>
          <MenuItem onClick={handleClose}>Standard Menu Item!</MenuItem>
          <IconMenuItem onClick={handleClose} label="Icon Menu Item" />
        </NestedMenuItem>
      </NestedMenuItem>
    </Menu>
  )
}
