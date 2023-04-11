import { MenuItem, Box, Tooltip } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'

import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { exportNetworkToCx2 } from '../../../store/exportCX'
import { Network } from '../../../models/NetworkModel'
import { IdType } from '../../../models/IdType'
import { AppConfigContext } from '../../../AppConfigContext'

export const CopyNetworkToNDExMenuItem = (
  props: BaseMenuProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const table = useTableStore((state) => state.tables[currentNetworkId])

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const viewModel = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )
  const visualStyle = useVisualStyleStore(
    (state) => state.visualStyles[currentNetworkId],
  )
  const network = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  ) as Network

  const getToken = useCredentialStore((state) => state.getToken)
  const client = useCredentialStore((state) => state.client)
  const authenticated: boolean = client?.authenticated ?? false

  const addNetworkToWorkspace = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )
  const setCurrentNetworkId = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )
  const saveCopyToNDEx = async (): Promise<void> => {
    const ndexClient = new NDEx(`${ndexBaseUrl}/v2`)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
      `Copy of ${summary.name}`,
    )
    try {
      const { uuid } = await ndexClient.createNetworkFromRawCX2(cx)
      addNetworkToWorkspace(uuid as IdType)
      // in the other places that this function is used, it seems that a setTimeout is required
      // for it to work properly
      // todo this should not be necessary
      setTimeout(() => {
        setCurrentNetworkId(uuid as IdType)
      }, 500)

      console.log(
        `Saved a copy of the current network to NDEx with new uuid ${
          uuid as string
        }`,
      )
    } catch (e) {
      console.log(e)
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
      Save a copy of the current network to NDEx
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
