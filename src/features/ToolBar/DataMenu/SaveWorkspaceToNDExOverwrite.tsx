import React, { useContext, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useSaveWorkspace } from '../../../data/hooks/useSaveWorkspaceToNDEx'
import { useWorkspaceData } from '../../../data/hooks/useWorkspaceData'
import { KeycloakContext } from '../../../init/keycloak'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu';
import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'


export const SaveWorkspaceToNDExOverwriteMenuItem = (
  props: BaseMenuItemProps,
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
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : 'Unknown error occurred'
      addMessage({
        message: `Failed to update the workspace to NDEx: ${errorMessage}`,
        duration: 4000,
        severity: MessageSeverity.ERROR,
      })
    }
    props.onClick()
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
    props.onClick()
  }
  const enabled = authenticated && allNetworkId.length > 0

  let tooltipTitle = ''
  if (enabled) {
    tooltipTitle = isRemoteWorkspace
      ? 'Overwrite workspace to NDEx'
      : 'Save workspace to NDEx'
  } else if (allNetworkId.length > 0) {
    tooltipTitle = 'Login to save/overwrite the current workspace to NDEx'
  }

  return (
    <>
      <DropdownMenuItem
        label="Save Workspace"
        tooltip={tooltipTitle}
        disabled={!enabled}
        onClick={enabled ? handleSaveWorkspaceToNDEx : () => {}}
      />
    {enabled && (
      <WorkspaceNamingDialog
        openDialog={openNamingDialog}
        onClose={onCloseWorkspaceNamingDialog}
        ndexBaseUrl={ndexBaseUrl}
        getToken={getToken}
      />
    )}
    </>
  )
}
