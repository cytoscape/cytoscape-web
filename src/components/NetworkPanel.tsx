import { ReactElement, Suspense } from 'react'
// import { useParams } from 'react-router-dom'
import { IdType } from '../models/IdType'
import { useWorkspaceStore } from '../store/WorkspaceStore'
import { MessagePanel } from './MessagePanel'
import NetworkRenderer from './NetworkRenderer'

const NetworkPanel = (): ReactElement => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  return currentNetworkId === '' || currentNetworkId === undefined ? (
    <MessagePanel message={'<-- Please select a network'} />
  ) : (
    <Suspense
      fallback={<MessagePanel message={'Loading Network...'} />}
      key={currentNetworkId}
    >
      <NetworkRenderer currentNetworkId={currentNetworkId} />
    </Suspense>
  )
}

export default NetworkPanel
