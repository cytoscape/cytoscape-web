import * as React from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { LoadFromNdexDialog } from './LoadFromNdexDialog'
import { useState } from 'react'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { Divider } from '@mui/material'
interface DropdownMenuProps {
  label: string
  children?: React.ReactNode
}

// Sample networks in dev server
const SAMPLE_NETWORKS: string[] = [
  '4acf76b6-23e0-11ed-9208-0242c246b7fb',
  'f33836d8-23df-11ed-9208-0242c246b7fb',
  'f9ca49da-3055-11ec-94bf-525400c25d22',
]

export const DataMenu: React.FC<DropdownMenuProps> = (props) => {
  const addNetworkIds: (ids: IdType | IdType[]) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const initWorkspace: () => void = useWorkspaceStore((state) => state.init)

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

  const handleLoadSamples = (): void => {
    setAnchorEl(null)

    // Load sample networks from NDEx
    addNetworkIds(SAMPLE_NETWORKS)
  }

  const handleClear = (): void => {
    setAnchorEl(null)
    initWorkspace()
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
          <MenuItem onClick={handleLoadSamples}>
            Load sample networks from NDEx (for Demo)
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleClear}>Start new workspace</MenuItem>
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