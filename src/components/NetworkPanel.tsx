import { ReactElement } from 'react'
// import { useParams } from 'react-router-dom'
import { IdType } from '../models/IdType'
import { Network } from '../models/NetworkModel'
import { useNetworkStore } from '../store/NetworkStore'
import { useWorkspaceStore } from '../store/WorkspaceStore'
// import { MessagePanel } from './Messages'
import NetworkRenderer from './NetworkRenderer'

const NetworkPanel = (): ReactElement => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  return (
    <NetworkRenderer
      network={
        networks.get(currentNetworkId) ?? { id: '', nodes: [], edges: [] }
      }
    />
  )

  // return currentNetworkId === '' || currentNetworkId === undefined ? (
  //   <MessagePanel message={'<-- Please select a network'} />
  // ) : (
  //   <Suspense
  //     fallback={<MessagePanel message={'Loading Network...'} />}
  //     key={currentNetworkId}
  //   >
  //     <NetworkRenderer currentNetworkId={currentNetworkId} />
  //   </Suspense>
  // )
}

export default NetworkPanel
