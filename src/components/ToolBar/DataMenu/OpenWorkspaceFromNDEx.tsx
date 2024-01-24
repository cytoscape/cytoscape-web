import { MenuItem, Box, Tooltip } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'


import { useCredentialStore } from '../../../store/CredentialStore'
import { AppConfigContext } from '../../../AppConfigContext'
import { useMessageStore } from '../../../store/MessageStore'
import { KeycloakContext } from '../../..'

export const OpenWorkspaceFromNDExMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const client = useContext(KeycloakContext)


  const getToken = useCredentialStore((state) => state.getToken)
  const authenticated: boolean = client?.authenticated ?? false

  const addMessage = useMessageStore((state) => state.addMessage)

  const saveCopyToNDEx = async (): Promise<void> => {
    const ndexClient = new NDEx(ndexBaseUrl)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
 
    try {
      const { uuid } = await ndexClient.updateCyWebWorkspaceName("ac12ba13-9865-11ec-b777-767437b87d4a","test")

      addMessage({
        message: `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
        duration: 3000,
      })
    } catch (e) {
      console.log(e)

      addMessage({
        message: `Error: Could not save a copy of the current network to NDEx. ${
          e.message as string
        }`,
        duration: 3000,
      })
    }

    props.handleClose()
  }

  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    await saveCopyToNDEx()
  }

  const menuItem = (
    <MenuItem
      disabled={!authenticated}
      onClick={handleSaveCurrentNetworkToNDEx}
    >
      Open workspace(s) from NDEx...
    </MenuItem>
  )

  if (authenticated) {
    return <>{menuItem}</>
  } else {
    return (
      <Tooltip title="Login to save a copy of the current network to NDEx">
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
