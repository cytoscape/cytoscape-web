import { Box, MenuItem, Tooltip } from '@mui/material'
import { ReactElement, useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { KeycloakContext } from '../../../init/keycloak'
import { BaseMenuProps } from '../BaseMenuProps'
import { LoadWorkspaceDialog } from './LoadWorkspaceDialog'

export const LoadWorkspaceMenuItem = (props: BaseMenuProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const { enableKeycloak } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const enabled = enableKeycloak && authenticated

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  return (
    <>
      <Tooltip
        arrow
        placement="right"
        title={
          enabled
            ? ''
            : !enableKeycloak
              ? 'User sign-in and NDEx account features are disabled for this installation'
              : 'Login to see your own workspace'
        }
      >
        <Box>
          <MenuItem disabled={!enabled} onClick={handleOpenDialog}>
            Open Workspace from NDEx...
          </MenuItem>
        </Box>
      </Tooltip>
      <LoadWorkspaceDialog open={openDialog} handleClose={handleCloseDialog} />
    </>
  )
}
