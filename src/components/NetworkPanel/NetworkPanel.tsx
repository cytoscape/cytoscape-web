import { Box } from '@mui/material'
import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { FloatingToolBar } from '../FloatingToolBar/FloatingToolBar'
import { MessagePanel } from '../Messages'
import { CyjsRenderer } from './CyjsRenderer'

interface NetworkPanelProps {
  networkId?: IdType
}

/**
 * Main network renderer visualizing the current network
 */
const NetworkPanel = ({ networkId }: NetworkPanelProps): ReactElement => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  if (networks.size === 0) {
    return <MessagePanel message="No network selected" />
  }

  const targetNetwork: Network = networks.get(currentNetworkId) ?? {
    id: '', // an empty network
    nodes: [],
    edges: [],
  }

  if (targetNetwork.id === '') {
    return <MessagePanel message="Preparing network data..." />
  }
  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <CyjsRenderer network={targetNetwork} />
      <FloatingToolBar />
    </Box>
  )
}

export default NetworkPanel
