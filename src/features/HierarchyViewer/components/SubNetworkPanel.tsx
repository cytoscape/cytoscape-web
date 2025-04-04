import { Box, Typography } from '@mui/material'
import { ReactElement, useContext, useEffect, useRef, useState } from 'react'
import { FloatingToolBar } from '../../../components/FloatingToolBar'
import { MessagePanel } from '../../../components/Messages'
import { CyjsRenderer } from '../../../components/NetworkPanel/CyjsRenderer'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { AppConfigContext } from '../../../AppConfigContext'
import { ndexQueryFetcher } from '../store/ndexQueryFetcher'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { Query } from './MainPanel'
import { useNetworkStore } from '../../../store/NetworkStore'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'
import { LayoutAlgorithm, LayoutEngine } from '../../../models/LayoutModel'
import { useLayoutStore } from '../../../store/LayoutStore'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useSubNetworkStore } from '../store/SubNetworkStore'

import { useQuery } from '@tanstack/react-query'
import { Table, ValueType } from '../../../models/TableModel'
import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import { useFilterStore } from '../../../store/FilterStore'
import { DEFAULT_FILTER_NAME } from './FilterPanel/FilterPanel'
import { FilterConfig } from '../../../models/FilterModel'
import { Aspect } from '../../../models/CxModel/Cx2/Aspect'
import { FILTER_ASPECT_TAG, FilterAspects } from '../model/FilterAspects'
import { createFilterFromAspect } from '../utils/filter-asprct-util'
import { CirclePackingType } from './CustomLayout/CirclePackingLayout'
import { CirclePackingView } from '../model/CirclePackingView'
import { applyCpLayout } from '../utils/hierarchy-util'
import { DefaultRenderer } from '../../../store/DefaultRenderer'
import { useUndoStore } from '../../../store/UndoStore'

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

  // ID of the interaction network
  interactionNetworkId: IdType

  // Optional: URL of the server storing the interaction network
  interactionNetworkHost: string
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
  interactionNetworkHost,
}: SubNetworkPanelProps): ReactElement => {
  const filterConfigs = useFilterStore((state) => state.filterConfigs)
  const addFilterConfig = useFilterStore((state) => state.addFilterConfig)

  // All networks in the main store
  const networks: Map<string, Network> = useNetworkStore(
    (state) => state.networks,
  )

  // A local state to keep track of the current query network id.
  // This is different from the current network id in the workspace.
  const [queryNetworkId, setQueryNetworkId] = useState<string>('')

  // Label of a new network to be created in the Desktop if the network does not have a summary
  const [networkLabel, setNetworkLabel] = useState<string>('')

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)
  const setActiveNetworkView: (id: IdType) => void = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const addStack = useUndoStore((state) => state.addStack)

  // For converting node names to node ids
  const tables = useTableStore((state) => state.tables)

  // Selected nodes in the sub network
  const selectedNodes: IdType[] = useSubNetworkStore(
    (state) => state.selectedNodes,
  )

  const getViewModel: (id: IdType) => NetworkView | undefined =
    useViewModelStore((state) => state.getViewModel)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)

  const viewModels: Record<string, NetworkView[]> = useViewModelStore(
    (state) => state.viewModels,
  )

  const [cpViewId, setCpViewId] = useState<IdType>('')
  const hierarchyViewModels: NetworkView[] = viewModels[hierarchyId]

  useEffect(() => {
    if (hierarchyViewModels === undefined) {
      return
    }
    hierarchyViewModels.forEach((hierarchyViewModel: NetworkView) => {
      const { type, viewId } = hierarchyViewModel
      if (type === CirclePackingType) {
        if (viewId !== undefined && viewId !== '' && viewId !== cpViewId)
          setCpViewId(viewId)
      } else {
        // console.log('Other model', hierarchyViewModel)
      }
    })
  }, [hierarchyViewModels])

  const queryNetworkViewModel: NetworkView | undefined =
    getViewModel(queryNetworkId)

  const selectedNodesInQueryNetwork: string[] =
    queryNetworkViewModel?.selectedNodes ?? []

  const setSelectedHierarchyNodeNames: (
    selectedHierarchyNodeNames: string[],
  ) => void = useSubNetworkStore((state) => state.setSelectedHierarchyNodes)

  useEffect(() => {
    // Convert node IDs to names
    const tableRecord = tables[queryNetworkId]
    if (tableRecord === undefined) {
      return
    }

    const { nodeTable } = tableRecord
    const { rows } = nodeTable

    // Select nodes in the circle packing view
    if (selectedNodesInQueryNetwork.length > 0) {
      // Select nodes in the circle packing view here
      const selectedNodeNames: string[] = selectedNodesInQueryNetwork.map(
        (nodeId: IdType) => {
          const row: Record<string, ValueType> | undefined = rows.get(nodeId)
          if (row === undefined) {
            return ''
          }
          return row.name as string
        },
      )
      setSelectedHierarchyNodeNames(selectedNodeNames)
    } else {
      // Clear selection in the circle packing view
      setSelectedHierarchyNodeNames([])
    }
  }, [queryNetworkViewModel?.selectedNodes])

  /**
   * Selection based on the leaf node selection in the circle packing packing view
   */
  useEffect(() => {
    if (queryNetworkId === undefined || queryNetworkId === '') {
      return
    }
    const tableRecord = tables[queryNetworkId]
    if (tableRecord === undefined) {
      return
    }

    const { nodeTable } = tableRecord

    const viewModel: NetworkView | undefined = getViewModel(queryNetworkId)
    if (viewModel !== undefined) {
      const { rows } = nodeTable
      const nodeIds = [...rows.keys()]

      const toBeSelected: IdType[] = []

      //find matched nodes by name
      selectedNodes.forEach((nodeName: string) => {
        // Find the row index of the node with the given name
        nodeIds.forEach((nodeId: IdType) => {
          const row = rows.get(nodeId)
          if (row === undefined) {
            return
          }
          if (row.name === nodeName) {
            toBeSelected.push(nodeId)
          }
        })
      })

      exclusiveSelect(queryNetworkId, toBeSelected, [])
    }
  }, [selectedNodes])

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

  const vs: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const prevQueryNetworkIdRef = useRef<string>()

  const getToken = useCredentialStore((state) => state.getToken)
  let interactionSourceUrl = interactionNetworkHost
  const { ndexBaseUrl } = useContext(AppConfigContext)

  if (interactionSourceUrl === '') {
    interactionSourceUrl = ndexBaseUrl
  }

  const result = useQuery({
    queryKey: [
      hierarchyId,
      interactionSourceUrl,
      rootNetworkId,
      subsystemNodeId,
      query,
      interactionNetworkId,
    ],
    queryFn: async ({ queryKey }) => {
      const token = await getToken()
      const keys = queryKey as string[]
      const data = await ndexQueryFetcher([...keys, token])
      return data
    },
    refetchOnReconnect: 'always',
  })
  const { data, error, isFetching } = result

  if (error !== undefined && error !== null) {
    console.error('Failed to get network', error)
  }

  // The query network to be rendered
  const queryNetwork: Network | undefined = networks.get(queryNetworkId)

  const handleClick = (): void => {
    setActiveNetworkView(queryNetworkId)
  }

  useEffect(() => {
    const viewModel: NetworkView | undefined = getViewModel(queryNetworkId)
    if (viewModel === undefined) {
      return
    }
    prevQueryNetworkIdRef.current = queryNetworkId
  }, [queryNetworkId])

  const updateNetworkView = (): string => {
    if (data === undefined) {
      return ''
    }

    const { network, visualStyle, networkViews, networkAttributes } = data

    const { nodes } = network
    const nodeCount = nodes.length
    const nodeViews = networkViews[0].nodeViews
    const nodeViewCount = Object.keys(nodeViews).length
    if (nodeCount !== nodeViewCount) {
      console.error('Node count mismatch', nodeCount, nodeViewCount)
      return ''
    }
    const newUuid: string = network.id.toString()

    setNetworkLabel(
      (networkAttributes?.attributes.name as string) ??
        'Interaction Network: ' + newUuid,
    )

    // Add parent network's style to the shared style store
    if (vs[rootNetworkId] === undefined && visualStyle !== undefined) {
      // Register the original style to DB
      addVisualStyle(rootNetworkId, visualStyle)
      addVisualStyle(newUuid, visualStyle)
    } else if (visualStyle === undefined) {
      addVisualStyle(newUuid, vs[rootNetworkId])
    } else {
      // Just use the given style as-is
      addVisualStyle(newUuid, visualStyle)
    }

    // Register objects to the stores.
    setQueryNetworkId(newUuid)
    return newUuid
  }

  const registerNetwork = (
    network: Network,
    networkView: NetworkView,
    nodeTable: Table,
    edgeTable: Table,
  ): void => {
    // Register new networks to the store if not cached
    const newNetworkId: string = network.id
    addNewNetwork(network)
    addTable(newNetworkId, nodeTable, edgeTable)
    addStack(newNetworkId, {
      undoStack: [],
      redoStack: [],
    })

    const newPositions = applyCpLayout(
      getCpViewModel() as CirclePackingView,
      subsystemNodeId,
      newNetworkId,
      nodeTable,
      networkView.nodeViews,
    )

    newPositions.forEach((position: [number, number], nodeId: IdType) => {
      const [x, y] = position
      networkView.nodeViews[nodeId].x = x
      networkView.nodeViews[nodeId].y = y
    })
    addViewModel(newNetworkId, networkView)

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

  const getCpViewModel = (): CirclePackingView | undefined => {
    if (cpViewId === '' || hierarchyViewModels === undefined) {
      return
    }
    const cpViewModel: NetworkView | undefined = hierarchyViewModels.find(
      (viewModel: NetworkView) => {
        if (viewModel.viewId === cpViewId) {
          return viewModel
        }
      },
    )
    if (cpViewModel === undefined) {
      return
    }
    return cpViewModel as CirclePackingView
  }

  useEffect(() => {
    if (data === undefined) {
      return
    }

    const { network, otherAspects, nodeTable, edgeTable } = data
    // Check optional data
    if (otherAspects !== undefined && otherAspects.length > 0) {
      // Check filter config is available or not
      const filterConfigAspect = otherAspects.find(
        (aspect: Aspect) => aspect[FILTER_ASPECT_TAG],
      )
      if (filterConfigAspect !== undefined) {
        const filterAspects: FilterAspects =
          filterConfigAspect[FILTER_ASPECT_TAG]

        const sourceNetworkId: IdType = network.id
        const filterConfigs: FilterConfig[] = createFilterFromAspect(
          sourceNetworkId,
          filterAspects,
          nodeTable,
          edgeTable,
        )
        filterConfigs.forEach((filterConfig: FilterConfig) => {
          addFilterConfig(filterConfig)
        })
      }
    }
    // Check if the network is already in the store
    const newUuid: string = network.id.toString()
    const queryNetwork: Network | undefined = networks.get(newUuid)
    if (queryNetwork === undefined) {
      registerNetwork(
        network,
        data.networkViews[0],
        data.nodeTable,
        data.edgeTable,
      )
    }

    if (queryNetworkId === newUuid) {
      return
    }

    updateNetworkView()
  }, [data])

  if (isFetching) {
    return (
      <MessagePanel
        message={`Loading network: ${queryNetworkId}`}
        showProgress={true}
      />
    )
  }

  if (error !== undefined && error !== null) {
    return (
      <MessagePanel
        message={`! Error Loading network: (${error.message})`}
        showProgress={false}
      />
    )
  }

  if (queryNetwork === undefined) {
    return <MessagePanel message={`Select a subsystem`} />
  }

  const filterConfig: FilterConfig | undefined = filterConfigs[queryNetwork.id]

  const displayMode: DisplayMode =
    filterConfig?.displayMode ?? DisplayMode.SELECT

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
          zIndex: 100,
          backgroundColor: 'transparent',
        }}
        variant={'subtitle1'}
      >
        Subsystem: {subNetworkName}
      </Typography>
      <CyjsRenderer network={queryNetwork} displayMode={displayMode} />
      <FloatingToolBar
        rendererId={DefaultRenderer.id}
        targetNetworkId={queryNetworkId ?? undefined}
        networkLabel={networkLabel}
      />
    </Box>
  )
}
