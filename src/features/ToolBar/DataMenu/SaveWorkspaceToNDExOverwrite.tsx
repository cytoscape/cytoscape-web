import { Box, MenuItem, Tooltip } from '@mui/material'
import React, { useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useSaveWorkspace } from '../../../data/hooks/useSaveWorkspaceToNDEx'
import { useWorkspaceData } from '../../../data/hooks/useWorkspaceData'
import { KeycloakContext } from '../../../init/keycloak'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuProps } from '../BaseMenuProps'
import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'

export const SaveWorkspaceToNDExOverwriteMenuItem = (
  props: BaseMenuProps,
): React.ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)
  const [openNamingDialog, setOpenNamingDialog] = useState<boolean>(false)

  const {
    apps,
    serviceApps,
    networks,
    visualStyles,
    summaries,
    tables,
    viewModels,
    networkVisualStyleOpt,
    opaqueAspects,
    allNetworkId,
    workspaceId,
    currentWorkspaceName,
    networkModifiedStatus,
    isRemoteWorkspace,
  } = useWorkspaceData()

  const saveWorkspace = useSaveWorkspace()

  const saveWorkspaceToNDEx = async (): Promise<void> => {
    try {
      const accessToken = await getToken()
      await saveWorkspace(
        accessToken,
        allNetworkId,
        networkModifiedStatus,
        networks,
        visualStyles,
        summaries,
        tables,
        viewModels,
        networkVisualStyleOpt,
        opaqueAspects,
        true,
        currentWorkspaceName,
        workspaceId,
        apps,
        serviceApps,
      )
    } catch (e) {
      addMessage({
        message: `Failed to update the workspace to NDEx.`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
    }
    props.handleClose()
  }

  const handleSaveWorkspaceToNDEx = async (): Promise<void> => {
    if (isRemoteWorkspace) {
      await saveWorkspaceToNDEx()
    } else {
      setOpenNamingDialog(true)
    }
  }

  const onCloseWorkspaceNamingDialog = () => {
    setOpenNamingDialog(false)
    props.handleClose()
  }
  const enabled = authenticated && allNetworkId.length > 0

  const menuItem = (
    <MenuItem disabled={!enabled} onClick={handleSaveWorkspaceToNDEx}>
      Save Workspace
    </MenuItem>
  )

  return (
    <>
      {enabled ? (
        <>
          <Tooltip
            arrow
            placement="right"
            title={
              isRemoteWorkspace
                ? 'Overwrite workspace to NDEx'
                : 'Save workspace to NDEx'
            }
          >
            <Box>{menuItem}</Box>
          </Tooltip>
          <WorkspaceNamingDialog
            openDialog={openNamingDialog}
            onClose={onCloseWorkspaceNamingDialog}
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
              ? 'Login to save/overwrite the current workspace to NDEx'
              : ''
          }
        >
          <Box>{menuItem}</Box>
        </Tooltip>
      )}
    </>
  )
}
