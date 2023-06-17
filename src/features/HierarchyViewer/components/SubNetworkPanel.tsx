import { Box } from '@mui/material'
import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
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
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { blue } from '@mui/material/colors'
import {
  putNetworkViewToDb,
  putVisualStyleToDb,
} from '../../../store/persist/db'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'

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
  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const setActiveNetworkView: (id: IdType) => void = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const viewModels: Record<string, NetworkView> = useViewModelStore(
    (state) => state.viewModels,
  )
  const vs: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const prevQueryNetworkIdRef = useRef<string>()

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

  // The query network to be rendered
  const queryNetwork: Network | undefined = networks.get(queryNetworkId)

  const handleClick = (e: any): void => {
    if (queryNetworkId !== undefined) {
      setActiveNetworkView(queryNetworkId)
    }
  }
  useEffect(() => {
    const viewModel: NetworkView | undefined = viewModels[queryNetworkId]
    if (viewModel === undefined) {
      return
    }
    void saveLastQueryNetworkId(queryNetworkId).then(() => {
      console.log('@@@@@@@@@@@@ Q rendering', queryNetworkId)
      prevQueryNetworkIdRef.current = queryNetworkId
    })
  }, [viewModels[queryNetworkId]])

  const saveLastQueryNetworkId = async (id: string): Promise<void> => {
    // const network: Network | undefined = networks.get(id)
    const visualStyle: VisualStyle | undefined = vs[id]
    await putVisualStyleToDb(id, visualStyle)

    const viewModel: NetworkView | undefined = viewModels[id]
    await putNetworkViewToDb(id, viewModel)
  }

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isLoading && data !== undefined && error === undefined) {
      const { network, visualStyle, nodeTable, edgeTable, networkView } = data
      const newUuid: string = network.id.toString()

      // Register objects to the stores.
      if (networks.get(newUuid) === undefined) {
        addNewNetwork(network)
        addVisualStyle(newUuid, visualStyle)
        addTable(newUuid, nodeTable, edgeTable)
        addViewModel(newUuid, networkView)
      }
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
    <Box
      sx={{
        height: '100%',
        width: '100%',
        border:
          queryNetworkId === activeNetworkId
            ? `4px solid ${blue[300]}`
            : 'none',
      }}
      onClick={handleClick}
    >
      <CyjsRenderer network={queryNetwork} />
      <FloatingToolBar targetNetworkId={queryNetworkId ?? undefined} />
    </Box>
  )
}
