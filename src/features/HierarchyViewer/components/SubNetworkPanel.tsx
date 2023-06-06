import { Box } from '@mui/material'
import { ReactElement, useContext } from 'react'
import { FloatingToolBar } from '../../../components/FloatingToolBar'
import { MessagePanel } from '../../../components/Messages'
import { CyjsRenderer } from '../../../components/NetworkPanel/CyjsRenderer'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { ndexQueryFetcher } from '../store/useQueryNetwork'
import useSWR from 'swr'
import { NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { NetworkWithView } from '../../../utils/cx-utils'
import { Query } from './ViewerPanel'

interface SubNetworkPanelProps {
  // Hierarchy network id
  networkId: IdType

  // The network id of the interaction network
  interactionNetworkId: IdType

  // ID of member nodes
  query: Query
}

/**
 * Provides the secondary network view for the associated hierarchy
 *
 */
export const SubNetworkPanel = ({
  networkId,
  interactionNetworkId,
  query,
}: SubNetworkPanelProps): ReactElement => {
  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[networkId],
  )
  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []

  const { ndexBaseUrl } = useContext(AppConfigContext)

  const { data, error } = useSWR<NetworkWithView>(
    [ndexBaseUrl, interactionNetworkId, query],
    ndexQueryFetcher,
    {
      revalidateOnFocus: false,
    },
  )

  console.log('###cxData', data, error, selectedNodes, query)

  let targetNetwork: Network = {
    id: '', // an empty network
    nodes: [],
    edges: [],
  }

  if (data !== undefined) {
    targetNetwork = data.network
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      {targetNetwork.id === '' ? (
        <Box
          sx={{
            zIndex: 200,
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
          }}
        >
          <MessagePanel message="Preparing network data..." />
        </Box>
      ) : null}
      <CyjsRenderer network={targetNetwork} />
      <FloatingToolBar />
    </Box>
  )
}
