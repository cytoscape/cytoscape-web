import { Box, MenuItem, Tooltip } from '@mui/material'
import { KeycloakContext } from '../../../bootstrap'
import { ReactElement, useContext, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadWorkspaceDialog } from './LoadWorkspaceDialog'

export const LoadWorkspaceMenuItem = (props: BaseMenuProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  return (
    <>
      <Tooltip title={authenticated ? '' : 'Login to see your own workspace'}>
        <Box>
          <MenuItem disabled={!authenticated} onClick={handleOpenDialog}>
            Open Workspace from NDEx...
          </MenuItem>
        </Box>
      </Tooltip>
      <LoadWorkspaceDialog open={openDialog} handleClose={handleCloseDialog} />
    </>
  )
}
