import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import { ReactElement, useContext } from 'react'

import { KeycloakContext } from '@/boot/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'
import { useNdexGate } from './ndexAvailability'

export const LoadWorkspaceMenuItem = (
  props: BaseMenuItemProps,
): ReactElement => {
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false
  const ndex = useNdexGate(
    authenticated,
    authenticated ? '' : 'Login to see your own workspace',
  )

  return (
    <DropdownMenuItem
      label="Open Workspace from NDEx..."
      tooltip={ndex.tooltip}
      icon={<CloudDownloadIcon />}
      disabled={ndex.disabled}
      onClick={props.onClick}
    />
  )
}
