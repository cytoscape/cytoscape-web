import { MenuItem } from '@mui/material'
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
import { AppConfigContext } from '../../../AppConfigContext'

export const SaveToNDExMenuItem = (props: BaseMenuProps): ReactElement => {
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
  const handleSaveCurrentNetworkToNDEx = async (): Promise<void> => {
    const cx = exportNetworkToCx2(
      network,
      visualStyle,
      summary,
      table.nodeTable,
      table.edgeTable,
      viewModel,
    )

    const ndexClient = new NDEx(`${ndexBaseUrl}/v2`)
    const accessToken = await getToken()
    ndexClient.setAuthToken(accessToken)
    ndexClient.createNetworkFromRawCX2(cx)

    props.handleClose()
  }

  return (
    <MenuItem onClick={handleSaveCurrentNetworkToNDEx}>
      Save current network to NDEx
    </MenuItem>
  )
}
