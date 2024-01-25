import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadWorkspaceFromNDExDialog } from './LoadWorkspaceFromNDExDialog'

export const LoadWorkspaceFromNDExMenuItem = (props: BaseMenuProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        Open workspace(s) from NDEx...
      </MenuItem>
      <LoadWorkspaceFromNDExDialog open={openDialog} handleClose={handleCloseDialog} />
    </>
  )
}
