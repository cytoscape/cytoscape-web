import { Button, Menu, MenuItem } from '@mui/material'
import { Suspense, useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import ExternalComponent from '../../AppManager/ExternalComponent'

export const AppMenu = (props: DropdownMenuProps) => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  // const SimpleMenu = ExternalComponent('hello', './MenuExample')
  const AppMenuItem = ExternalComponent('menu', './AppMenuItem')

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
        <Suspense fallback={<div>Loading...</div>}>
          {/* <SimpleMenu /> */}
          <AppMenuItem />
        </Suspense>
      </Menu>
    </div>
  )
}
