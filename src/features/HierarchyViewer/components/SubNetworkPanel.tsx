import { Box } from '@mui/material'
import { ReactElement, useContext, useEffect, useState } from 'react'
import { FloatingToolBar } from '../../../components/FloatingToolBar'
import { MessagePanel } from '../../../components/Messages'
import { CyjsRenderer } from '../../../components/NetworkPanel/CyjsRenderer'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { ndexQueryFetcher } from '../store/useQueryNetwork'
import useSWR from 'swr'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { NetworkWithView } from '../../../utils/cx-utils'
import { Query } from './ViewerPanel'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useTableStore } from '../../../store/TableStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { createDummySummary } from '../utils/hierarcy-util'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'

interface SubNetworkPanelProps {
  // The network id of the _*ROOT*_ interaction network
  rootNetworkId: IdType

  // Selected subsystem node id
  subsystemNodeId: IdType

  // ID of member nodes
  query: Query
}

/**
 * Provides the secondary network view for the associated hierarchy
 *
 */
export const SubNetworkPanel = ({
  rootNetworkId,
  subsystemNodeId,
  query,
}: SubNetworkPanelProps): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const { data, error, isLoading } = useSWR<NetworkWithView>(
    [ndexBaseUrl, rootNetworkId, subsystemNodeId, query],
    ndexQueryFetcher,
    {
      revalidateOnFocus: false,
    },
  )

  // A local state to keep track of the current query network id.
  // This is different from the current network id in the workspace.
  const [queryNetworkId, setQueryNetworkId] = useState<string>('')

  // All networks in the main store
  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const addSummary: (networkId: IdType, summary: NdexNetworkSummary) => void =
    useNetworkSummaryStore((state) => state.add)

  // The query network to be rendered
  const queryNetwork: Network | undefined = networks.get(queryNetworkId)

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)

  useEffect(() => {
    // Fetch the network data when new subsystem node is selected
    console.log('### isLoading updated', isLoading, data)

    if (isLoading) {
      return
    }

    if (!isLoading && data !== undefined && error === undefined) {
      const { network, nodeTable, edgeTable, visualStyle, networkView } = data
      const newUuid: string = network.id

      // Create Dummy summary
      // TODO: Create actual network summary instead
      const summary: NdexNetworkSummary = createDummySummary(
        newUuid,
        'Subsystem: ' + subsystemNodeId,
        network.nodes.length,
        network.edges.length,
      )
      addSummary(newUuid, summary)
      // Register objects to the stores.
      addNewNetwork(network)
      addVisualStyle(newUuid, visualStyle)
      addTable(newUuid, nodeTable, edgeTable)
      addViewModel(newUuid, networkView)
      setQueryNetworkId(newUuid)
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <MessagePanel
        message={`Loading network: ${queryNetworkId}`}
        showProgress={true}
      />
    )
  }

  if (queryNetwork === undefined) {
    return <MessagePanel message={`Select a subsystem`} />
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <CyjsRenderer network={queryNetwork} />
      <FloatingToolBar targetNetworkId={queryNetworkId ?? undefined} />
    </Box>
  )
}
