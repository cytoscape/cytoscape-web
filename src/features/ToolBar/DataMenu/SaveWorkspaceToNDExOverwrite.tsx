import React, { useContext } from 'react'

import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useSaveWorkspace } from '../../../data/hooks/useSaveWorkspaceToNDEx'
import { useWorkspaceData } from '../../../data/hooks/useWorkspaceData'
import { KeycloakContext } from '@/boot/keycloak'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

interface SaveWorkspaceToNDExOverwriteMenuItemProps extends BaseMenuItemProps {
  /** Close the menu and ask for a name: the workspace is not on NDEx yet. */
  onSaveAs: () => void
}

/**
 * Data > Save Workspace. A workspace already on NDEx is overwritten in the
 * background once the menu has closed; a local one needs a name first, and
 * the naming dialog belongs to the Data menu, not to this row (#784).
 */
export const SaveWorkspaceToNDExOverwriteMenuItem = (
  props: SaveWorkspaceToNDExOverwriteMenuItemProps,
): React.ReactElement => {
  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false
  const addMessage = useMessageStore((state) => state.addMessage)

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
  }

  const handleSaveWorkspaceToNDEx = (): void => {
    if (!isRemoteWorkspace) {
      props.onSaveAs()
      return
    }
    // Close the menu right away; the save continues in the background (this
    // row unmounts with the menu, but the closure keeps what it captured) and
    // reports a failure through the message snackbar.
    props.onClick()
    void saveWorkspaceToNDEx()
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
    <DropdownMenuItem
      label="Save Workspace"
      tooltip={tooltipTitle}
      disabled={!enabled}
      onClick={enabled ? handleSaveWorkspaceToNDEx : () => {}}
    />
  )
}
