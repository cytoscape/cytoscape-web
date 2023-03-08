import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import { Divider } from '@mui/material'
import { RemoveAllNetworksMenuItem } from './RemoveAllNetworksMenuItem'
import { RemoveNetworkMenuItem } from './RemoveNetworkMenuItem'
import { LoadDemoNetworksMenuItem } from './LoadDemoNetworksMenuItem'
import { LoadFromNdexMenuItem } from './LoadFromNdexMenuItem'
import { SaveToNDExMenuItem } from './SaveToNDExMenuItem'
import { useState } from 'react'
interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

export const DataMenu: React.FC<DropdownMenuProps> = (
  props: DropdownMenuProps,
) => {
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
        <LoadFromNdexMenuItem handleClose={handleClose} />
        <LoadDemoNetworksMenuItem handleClose={handleClose} />
        <Divider />
        <RemoveNetworkMenuItem handleClose={handleClose} />
        <RemoveAllNetworksMenuItem handleClose={handleClose} />
        <Divider />
        <SaveToNDExMenuItem handleClose={handleClose} />
      </Menu>
    </div>
  )
}
