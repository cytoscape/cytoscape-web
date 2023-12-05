import { Box, Typography } from '@mui/material'
import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
import { FloatingToolBar } from '../../../components/FloatingToolBar'
import { MessagePanel } from '../../../components/Messages'
import { CyjsRenderer } from '../../../components/NetworkPanel/CyjsRenderer'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { ndexQueryFetcher } from '../store/ndexQueryFetcher'
import useSWR from 'swr'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { NetworkWithView } from '../../../utils/cx-utils'
import { Query } from './MainPanel'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import {
  putNetworkViewToDb,
  putVisualStyleToDb,
} from '../../../store/persist/db'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { useCredentialStore } from '../../../store/CredentialStore'

interface SubNetworkPanelProps {
  // Hierarchy ID
  hierarchyId: IdType

  // Name of the network visualized here
  subNetworkName: string

  // The network id of the _*ROOT*_ interaction network
  rootNetworkId: IdType

  // Selected subsystem node id
  subsystemNodeId: IdType

  // ID of member nodes
  query: Query

  interactionNetworkId: IdType
}

/**
 * Provides the secondary network view for the associated hierarchy
 *
 */
export const SubNetworkPanel = ({
  hierarchyId,
  subNetworkName,
  rootNetworkId,
  subsystemNodeId,
  query,
  interactionNetworkId,
}: SubNetworkPanelProps): ReactElement => {
  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const setActiveNetworkView: (id: IdType) => void = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )

  // For applying default layout
  const defaultLayout: LayoutAlgorithm = useLayoutStore(
    (state) => state.preferredLayout,
  )

  const setIsRunning: (isRunning: boolean) => void = useLayoutStore(
    (state) => state.setIsRunning,
  )

  const layoutEngines: LayoutEngine[] = useLayoutStore(
    (state) => state.layoutEngines,
  )

  const engine: LayoutEngine =
    layoutEngines.find((engine) => engine.name === defaultLayout.engineName) ??
    layoutEngines[0]

  const updateNodePositions: (
    networkId: IdType,
    positions: Map<IdType, [number, number, number?]>,
  ) => void = useViewModelStore((state) => state.updateNodePositions)

  // This will be used to highlight the active network border
  const ui = useUiStateStore((state) => state.ui)
  const { activeNetworkView } = ui

  const viewModels: Record<string, NetworkView> = useViewModelStore(
    (state) => state.viewModels,
  )
  const vs: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const prevQueryNetworkIdRef = useRef<string>()

  const getToken = useCredentialStore((state) => state.getToken)

  const fetcher = async (args: string[]): Promise<any> => {
    const token = await getToken()
    return await ndexQueryFetcher([...args, token])
  }

  const { ndexBaseUrl } = useContext(AppConfigContext)
  const { data, error, isLoading } = useSWR<NetworkWithView>(
    [
      hierarchyId,
      ndexBaseUrl,
      rootNetworkId,
      subsystemNodeId,
      query,
      interactionNetworkId,
    ],
    fetcher,
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
      updateNetworkView()
    }
  }, [isLoading])

  const updateNetworkView = (): string => {
    if (data === undefined) {
      return ''
    }
    const { network, visualStyle, nodeTable, edgeTable, networkView } = data
    const newUuid: string = network.id.toString()

    // Add parent network's style to the shared style store
    if (vs[rootNetworkId] === undefined) {
      // Register the original style to DB
      addVisualStyle(rootNetworkId, visualStyle)
      addVisualStyle(newUuid, visualStyle)
    } else {
      addVisualStyle(newUuid, vs[rootNetworkId])
    }
    // Register objects to the stores.
    if (networks.get(newUuid) === undefined) {
      // Register new networks to the store if not cached
      addNewNetwork(network)
      addTable(newUuid, nodeTable, edgeTable)
      addViewModel(newUuid, networkView)

      if (interactionNetworkId === undefined || interactionNetworkId === '') {
        // Apply default layout for the first time
        const afterLayout = (
          positionMap: Map<IdType, [number, number]>,
        ): void => {
          updateNodePositions(network.id, positionMap)
          setIsRunning(false)
        }

        if (network !== undefined && engine !== undefined) {
          setIsRunning(true)
          engine.apply(network.nodes, network.edges, afterLayout, defaultLayout)
        }
      }
    }
    setQueryNetworkId(newUuid)
    return newUuid
  }

  useEffect(() => {
    if (data === undefined) {
      return
    }

    const { network } = data
    const newUuid: string = network.id.toString()

    if (queryNetworkId === newUuid) {
      return
    }

    updateNetworkView()
  }, [data])

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
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        border:
          activeNetworkView === queryNetwork.id
            ? '3px solid orange'
            : '3px solid transparent',
      }}
      onClick={handleClick}
    >
      <Typography
        sx={{
          position: 'absolute',
          bottom: '0.5em',
          left: '0.5em',
          zIndex: 3000,
          backgroundColor: 'transparent',
        }}
        variant={'subtitle1'}
      >
        Subsystem: {subNetworkName}
      </Typography>
      <CyjsRenderer network={queryNetwork} />
      <FloatingToolBar targetNetworkId={queryNetworkId ?? undefined} />
    </Box>
  )
}
