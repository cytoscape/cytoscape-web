import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { useState } from 'react'

import { DropdownMenuProps } from '../DropdownMenuProps'
import { CreateEdgeMenuItem } from './CreateEdgeMenuItem'
import { CreateNodeMenuItem } from './CreateNodeMenuItem'
import { DeleteSelectedEdgesMenuItem } from './DeleteSelectedEdgesMenuItem'
import { DeleteSelectedNodesMenuItem } from './DeleteSelectedNodesMenuItem'
import { RedoMenuItem } from './RedoMenuItem'
import { UndoMenuItem } from './UndoMenuItem'

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
        data-testid="toolbar-edit-menu-button"
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
        data-testid="toolbar-edit-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': label,
        }}
      >
        <CreateNodeMenuItem handleClose={handleClose} />
        <CreateEdgeMenuItem handleClose={handleClose} />
        <DeleteSelectedNodesMenuItem handleClose={handleClose} />
        <DeleteSelectedEdgesMenuItem handleClose={handleClose} />
        <UndoMenuItem handleClose={handleClose} />
        <RedoMenuItem handleClose={handleClose} />
      </Menu>
    </div>
  )
}
