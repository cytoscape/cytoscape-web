import { ReactElement } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { MessagePanel } from '../Messages'
import { NetworkRenderer } from './NetworkRenderer'

const NetworkPanel = (): ReactElement => {
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

  return <NetworkRenderer network={targetNetwork} />
}

export default NetworkPanel
