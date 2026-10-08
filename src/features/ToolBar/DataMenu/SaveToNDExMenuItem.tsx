import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { ReactElement, useContext, useEffect, useState } from 'react'

import { AppConfigContext } from '../../../AppConfigContext'
import { hasNdexEditPermission } from '../../../data/external-api/ndex'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { KeycloakContext } from '@/boot/keycloak'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'

/**
 * Data > Save Network to NDEx. The save and its dialogs belong to the Data
 * menu (`useSaveNetworkToNDExFlow`), not to this row (#784): `onClick` closes
 * the menu and starts the flow. The row only decides whether it is enabled,
 * which needs the user's edit permission on the NDEx copy.
 */
export const SaveToNDExMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const [editPermission, setEditPermission] = useState<boolean>(false)
  const [tooltipText, setTooltipText] = useState<string>('')
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const isModified =
    useWorkspaceStore(
      (state) => state.workspace.networkModified[currentNetworkId],
    ) ?? false

  const client = useContext(KeycloakContext)
  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false

  useEffect(() => {
    const fetchPermission = async () => {
      if (authenticated && currentNetworkId) {
        try {
          const accessToken = await getToken()
          const hasPermission = await hasNdexEditPermission(
            currentNetworkId,
            accessToken,
            ndexBaseUrl,
          )
          setEditPermission(hasPermission)
        } catch (e) {
          logUi.error(
            `[${fetchPermission.name}]: Error fetching permissions:`,
            e,
          )
          setEditPermission(false)
        }
      }
    }
    if (!authenticated) {
      setEditPermission(false)
      return
    }
    fetchPermission()
  }, [authenticated, currentNetworkId, ndexBaseUrl, getToken])

  useEffect(() => {
    if (currentNetworkId === '') {
      setTooltipText('')
    } else if (!authenticated) {
      setTooltipText('Login to save network to NDEx')
    } else if (summary?.isNdex === false) {
      setTooltipText(
        'This network is currently stored locally. Click here to save it to NDEx ',
      )
    } else if (!editPermission) {
      setTooltipText('Sorry, you do not have edit permission to this network')
    } else if (!isModified) {
      setTooltipText('This network has not been modified since the last save')
    } else {
      setTooltipText('Overwrite network to NDEx')
    }
  }, [
    isModified,
    authenticated,
    editPermission,
    summary?.isNdex,
    currentNetworkId,
  ])

  const enabled =
    currentNetworkId !== '' &&
    (summary?.isNdex ? isModified && editPermission : authenticated)

  return (
    <DropdownMenuItem
      label="Save Network to NDEx"
      tooltip={tooltipText}
      icon={<CloudUploadIcon />}
      disabled={!enabled}
      onClick={props.onClick}
    />
  )
}
