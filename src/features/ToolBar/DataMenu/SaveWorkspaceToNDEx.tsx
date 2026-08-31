import React, { useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { KeycloakContext } from '@/boot/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'
import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'

export const SaveWorkspaceToNDExMenuItem = (
  props: BaseMenuItemProps,
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
    props.onClick()
  }

  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)

  const enabled = authenticated && allNetworkId.length > 0

  let tooltipTitle = ''
  if (!enabled && allNetworkId.length > 0) {
    tooltipTitle = 'Login to save a copy of the current workspace to NDEx'
  }

  return (
    <>
      <DropdownMenuItem
        label="Save Workspace to NDEx As..."
        tooltip={tooltipTitle}
        disabled={!enabled}
        onClick={enabled ? handleSaveWorkspaceToNDEx : () => {}}
      />
      {enabled && (
        <WorkspaceNamingDialog
          openDialog={openDialog}
          onClose={handleCloseDialog}
          ndexBaseUrl={ndexBaseUrl}
          getToken={getToken}
        />
      )}
    </>
  )
}
