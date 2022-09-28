import * as React from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const DropdownMenu: React.FC<DropdownMenuProps> = (props) => {
  const { label } = props

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const labelId = `${label}-dropdown`

  return (
    <div>
      <Button
        sx={{
          color: 'white',
          textTransform: 'none',
        }}
        id={labelId}
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': labelId,
        }}
      >
        <MenuItem onClick={handleClose}>Menu Item</MenuItem>
        <MenuItem onClick={handleClose}>Menu Item</MenuItem>
        <MenuItem onClick={handleClose}>Menu Item</MenuItem>
      </Menu>
    </div>
  )
}
