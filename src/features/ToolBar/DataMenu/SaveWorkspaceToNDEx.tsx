import { Tooltip } from '@mui/material'
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
    <div
      onClick={enabled ? handleSaveWorkspaceToNDEx : undefined}
      style={{
        padding: '0.375rem 1rem',
        cursor: enabled ? 'pointer' : 'not-allowed',
        lineHeight: '1.5rem',
        opacity: enabled ? 1 : 0.5,
        pointerEvents: enabled ? 'auto' : 'none',
      }}
    >
      Save Workspace As...
    </div>
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
          <span>{menuItem}</span>
        </Tooltip>
      )}
    </>
  )
}
