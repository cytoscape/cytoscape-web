import * as React from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'
import { useState } from 'react'
interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const DataMenu: React.FC<DropdownMenuProps> = (props) => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const { label } = props

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    setAnchorEl(event.currentTarget)
  }

  const handleLoad = (uuid: string): void => {
    console.log('Got UUID: ', uuid)
    setOpenDialog(false)
  }

  const handleClose = (): void => {
    setAnchorEl(null)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
  }

  const handleOpenDialog = (): void => {
    setAnchorEl(null)
    setOpenDialog(true)
  }

  const labelId = `${label}-dropdown`

  return (
    <>
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
          <MenuItem onClick={handleOpenDialog}>
            Load network from NDEx...
          </MenuItem>
        </Menu>
      </div>
      <LoadFromNdexDialog
        open={openDialog}
        handleClose={handleCloseDialog}
        handleLoad={handleLoad}
      />
    </>
  )
}
