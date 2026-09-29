import React, { useContext } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { KeycloakContext } from '@/boot/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Data > Save Workspace As. The naming dialog belongs to the Data menu, not to
 * this row (#784): `onClick` closes the menu and opens it.
 */
export const SaveWorkspaceToNDExMenuItem = (
  props: BaseMenuItemProps,
): React.ReactElement => {
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)

  const enabled = authenticated && allNetworkId.length > 0

  let tooltipTitle = ''
  if (!enabled && allNetworkId.length > 0) {
    tooltipTitle = 'Login to save a copy of the current workspace to NDEx'
  }

  return (
    <DropdownMenuItem
      label="Save Workspace As..."
      tooltip={tooltipTitle}
      disabled={!enabled}
      onClick={enabled ? props.onClick : () => {}}
    />
  )
}
