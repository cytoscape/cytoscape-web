import React, { useState, useContext } from 'react'
import { MenuItem, Box, Tooltip } from '@mui/material'
import { BaseMenuProps } from '../BaseMenuProps'
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { useCredentialStore } from '../../../store/CredentialStore'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../../bootstrap'
import { useSaveWorkspace } from '../../../utils/ndex-utils'
import { ConfirmationDialog } from '../../Util/ConfirmationDialog'
import { MessageSeverity } from '../../../models/MessageModel'
import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'
import { useWorkspaceData } from '../../../store/hooks/useWorkspaceData'

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
      const ndexClient = new NDEx(ndexBaseUrl)
      await saveWorkspace(
        accessToken,
        ndexBaseUrl,
        ndexClient,
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
