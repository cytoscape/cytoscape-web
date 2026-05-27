import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import { ReactElement, useContext } from 'react'

import { KeycloakContext } from '../../../init/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

export const LoadWorkspaceMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const client = useContext(KeycloakContext)
  const authenticated: boolean = client?.authenticated ?? false

  return (
    <DropdownMenuItem
      label="Open Workspace from NDEx..."
      tooltip={authenticated ? '' : 'Login to see your own workspace'}
      icon={<CloudDownloadIcon />}
      disabled={!authenticated}
      onClick={props.onClick}
    />
  )
}
