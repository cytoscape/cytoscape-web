import { Button, Menu, MenuItem } from '@mui/material'
import { lazy, ReactNode, Suspense, useEffect, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'

const SimpleMenu = lazy(() => import('hello/MenuExample' as any))

export const AppMenu = (props: DropdownMenuProps) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  useEffect(() => {
    console.log('####### Simple AppMenu loaded', SimpleMenu)
    if (SimpleMenu !== undefined) {
      console.log('####### Adding Simple AppMenu loaded', SimpleMenu)
      setMenuItems([<SimpleMenu key="simple-menu" />])
    }
  }, [SimpleMenu])

  const [menuItems, setMenuItems] = useState<ReactNode[]>([])

  const handleOpenDropdownMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  return (
    <div>
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
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <MenuItem>Test</MenuItem>
        {menuItems}
      </Menu>
    </div>
  )
}
