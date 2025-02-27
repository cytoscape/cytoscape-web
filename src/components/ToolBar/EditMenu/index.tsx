import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'

import { useState } from 'react'
import { DropdownMenuProps } from '../DropdownMenuProps'
import { DeleteSelectedNodesMenuItem } from './DeleteSelectedNodesMenuItem'
import { DeleteSelectedEdgesMenuItem } from './DeleteSelectedEdgesMenuItem'
import { Box } from '@mui/material'

export const EditMenu = (props: DropdownMenuProps): JSX.Element => {
  const { label } = props
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

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
        <Box sx={{ fontSize: '0.875rem' }}>{label}</Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <DeleteSelectedNodesMenuItem handleClose={handleClose} />
        <DeleteSelectedEdgesMenuItem handleClose={handleClose} />
      </Menu>
    </div>
  )
}
