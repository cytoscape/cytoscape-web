import { MenuItem } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadWorkspaceDialog } from './LoadWorkspaceDialog'

export const LoadWorkspaceMenuItem = (props: BaseMenuProps): ReactElement => {
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
      <LoadWorkspaceDialog open={openDialog} handleClose={handleCloseDialog} />
    </>
  )
}
