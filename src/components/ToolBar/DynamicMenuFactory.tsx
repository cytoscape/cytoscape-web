import { Button } from '@mui/material'
import { MenuItem as MenuObj } from '../../models/MenuModel'
import { Menu, MenuItem } from '@mui/material'

export const createMenu = (
  baseLabel: string,
  open: boolean,
  menuItems: MenuObj[],
): JSX.Element => {
  const baseMenu = (
    <div>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={baseLabel}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        // onClick={handleOpenDropdownMenu}
      >
        {baseLabel}
      </Button>
      <Menu
        // anchorEl={anchorEl}
        open={open}
        // onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': baseLabel,
        }}
      >
        {menuItems.map((item: MenuObj) => (
          <MenuItem key={item.id} onClick={() => console.log(item.id)}>
            {item.name}
          </MenuItem>
        ))}
      </Menu>
    </div>
  )

  return baseMenu
}
