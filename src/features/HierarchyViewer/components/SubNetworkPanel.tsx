import { Box } from '@mui/material'
import { red } from '@mui/material/colors'
import { ReactElement, useContext } from 'react'
import { FloatingToolBar } from '../../../components/FloatingToolBar'
import { MessagePanel } from '../../../components/Messages'
import { CyjsRenderer } from '../../../components/NetworkPanel/CyjsRenderer'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { Cx2 } from '../../../models/CxModel/Cx2'
import { ndexQueryFetcher } from '../store/useQueryNetwork'
import useSWR from 'swr'
import { NetworkView } from '../../../models/ViewModel'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'
import { ValueType } from '../../../models/TableModel'

interface SubNetworkPanelProps {
  networkId: IdType
}

/**
 * Provides the secondary network view for the associated hierarchy
 *
 */
export const SubNetworkPanel = ({
  networkId,
}: SubNetworkPanelProps): ReactElement => {
  const { nodeTable } = useTableStore((state) => state.tables[networkId])

  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[networkId],
  )
  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []
  const { ndexBaseUrl } = useContext(AppConfigContext)

  // As a test case, we are going to use selectedNodes to query NDEx

  // const getToken: () => Promise<string> = useCredentialStore(
  //   (state) => state.getToken,
  // )

  const rows = nodeTable.rows
  const names: ValueType[] = selectedNodes.map((nodeId) => {
    const row = rows.get(nodeId)
    return row !== undefined ? row.name : ''
  })

  const { data, error } = useSWR<Cx2>(
    [ndexBaseUrl, networkId, names.join(' ')],
    ndexQueryFetcher,
    {
      revalidateOnFocus: false,
    },
  )

  console.log('###cxData', data, error, selectedNodes, names)
  if (selectedNodes.length === 0) {
    return <MessagePanel message="No nodes selected" />
  }

  const targetNetwork: Network = {
    id: '', // an empty network
    nodes: [],
    edges: [],
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      {targetNetwork.id === '' ? (
        <Box
          sx={{
            zIndex: 200,
            background: red[100],
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
