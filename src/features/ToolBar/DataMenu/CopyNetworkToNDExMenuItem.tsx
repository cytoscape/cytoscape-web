import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { ReactElement, useContext } from 'react'

import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { KeycloakContext } from '@/boot/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Data > Save Copy to NDEx. The save and its HCX warning belong to the Data
 * menu (`useSaveNetworkCopyToNDExFlow`), not to this row (#784): `onClick`
 * closes the menu and starts the flow.
 */
export const CopyNetworkToNDExMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const enabled = authenticated && currentNetworkId !== ''

  let tooltipTitle = ''
  if (!authenticated && currentNetworkId !== '') {
    tooltipTitle = 'Login to save a copy of the current network to NDEx'
  }

  return (
    <DropdownMenuItem
      label="Save Copy to NDEx"
      icon={<CloudUploadIcon />}
      tooltip={tooltipTitle}
      disabled={!enabled}
      onClick={props.onClick}
    />
  )
}
