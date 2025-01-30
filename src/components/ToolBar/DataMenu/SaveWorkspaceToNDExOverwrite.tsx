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
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false)
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
    currentNetworkId,
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
        currentNetworkId,
      )
    } catch (e) {
      addMessage({
        message: `Failed to update workspace to NDEx.`,
        duration: 5000,
        severity: MessageSeverity.ERROR,
      })
    }

    setOpenConfirmDialog(false)
    props.handleClose()
  }

  const handleSaveWorkspaceToNDEx = async (): Promise<void> => {
    if (isRemoteWorkspace) {
      setOpenConfirmDialog(true)
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
          {menuItem}
          <ConfirmationDialog
            title="Save Workspace to NDEx"
            message="Do you want to save/overwrite the current workspace to NDEx?"
            onConfirm={saveWorkspaceToNDEx}
            open={openConfirmDialog}
            setOpen={setOpenConfirmDialog}
            buttonTitle="Save"
            isAlert={true}
          />
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
