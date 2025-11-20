import { Box, MenuItem, Tooltip } from '@mui/material'
import React, { useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { KeycloakContext } from '../../../init/keycloak'
import { BaseMenuProps } from '../BaseMenuProps'
import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'

export const SaveWorkspaceToNDExMenuItem = (
  props: BaseMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const [openDialog, setOpenDialog] = useState<boolean>(false)

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }
  const handleSaveWorkspaceToNDEx = async (): Promise<void> => {
    handleOpenDialog()
  }
  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)

  const enabled = authenticated && allNetworkId.length > 0

  const menuItem = (
    <MenuItem disabled={!enabled} onClick={handleSaveWorkspaceToNDEx}>
      Save Workspace As...
    </MenuItem>
  )

  return (
    <>
      {enabled ? (
        <>
          {menuItem}
          <WorkspaceNamingDialog
            openDialog={openDialog}
            onClose={handleCloseDialog}
            ndexBaseUrl={ndexBaseUrl}
            getToken={getToken}
          />
        </>
      ) : (
        <Tooltip
          arrow
          placement="right"
          title={
            allNetworkId.length > 0
              ? 'Login to save a copy of the current workspace to NDEx'
              : ''
          }
        >
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
    </>
  )
}
