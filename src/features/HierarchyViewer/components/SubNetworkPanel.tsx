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
  const [isProcessing, setIsProcessing] = useState<boolean>(false)


  // Tracking processing progress
  const [processingProgress, setProcessingProgress] = useState<number>(0)

  // Message to show during processing
  const [processingStage, setProcessingStage] = useState<string>('')

  /**
   * Helper function to yield control back to the UI thread
   *
   *  This will be used to prevent blocking the UI during
   * long-running CPU-bound operations.
   */
  const yieldToUI = async (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 0))
  }

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

  // Re-add the missing getCpViewModel function
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

  const registerNetwork = async (
    network: Network,
    networkView: NetworkView,
    nodeTable: Table,
    edgeTable: Table,
  ): Promise<void> => {
    // Register new networks to the store if not cached
    const newNetworkId: string = network.id

    // Step 1: Add network to store
    setProcessingStage('Adding network data...')
    setProcessingProgress(45)
    addNewNetwork(network)
    await yieldToUI()

    // Step 2: Add table data
    setProcessingStage('Adding table data...')
    setProcessingProgress(50)
    addTable(newNetworkId, nodeTable, edgeTable)
    addStack(newNetworkId, {
      undoStack: [],
      redoStack: [],
    })
    await yieldToUI()

    // Step 3: Calculate layout positions using Web Worker (heaviest operation)
    setProcessingStage(
      'Applying layout (this may take a while for the first time)...',
    )
    setProcessingProgress(55)
    await yieldToUI()

    const cpViewModel = getCpViewModel() as CirclePackingView

    // Create a promise that will resolve when the worker completes
    const calculatePositions = (): Promise<Map<IdType, [number, number]>> => {
      return new Promise((resolve, reject) => {
        try {
          // Create web worker
          const worker = new Worker(
            new URL('../workers/cpLayoutWorker.ts', import.meta.url),
            { type: 'module' },
          )

          // Handle worker response
          worker.onmessage = (event) => {
            if (event.data.success) {
              // Convert array back to Map
              const positionsMap = new Map<IdType, [number, number]>()
              // Add explicit type annotations to fix the type error
              event.data.positions.forEach(
                (entry: [IdType, [number, number]]) => {
                  const [id, pos] = entry
                  positionsMap.set(id, [pos[0], pos[1]])
                },
              )
              resolve(positionsMap)
              worker.terminate()
            } else {
              reject(new Error(event.data.error || 'Worker calculation failed'))
              worker.terminate()
            }
          }

          // Handle worker error
          worker.onerror = (error) => {
            console.error('Worker error:', error)
            reject(new Error('Worker error'))
            worker.terminate()
          }

          // Start the worker with necessary data to apply the layout
          worker.postMessage({
            cpViewModel,
            subsystemNodeId,
            networkId: newNetworkId,
            nodeTable,
            nodeViews: networkView.nodeViews,
          })

          // Update progress while worker is running
          const progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              const newProgress = Math.min(74, prev + 1)
              if (newProgress >= 74) {
                clearInterval(progressInterval)
              }
              return newProgress
            })
          }, 200)
        } catch (error) {
          // Fallback to synchronous calculation if worker fails
          console.warn(
            'Web Worker failed, falling back to synchronous calculation:',
            error,
          )
          const newPositions = applyCpLayout(
            cpViewModel,
            subsystemNodeId,
            newNetworkId,
            nodeTable,
            networkView.nodeViews,
          )
          resolve(newPositions)
        }
      })
    }

    // Execute worker and wait for result
    const newPositions = await calculatePositions()

    setProcessingProgress(75)
    await yieldToUI()

    // Step 4: Update node positions with the results from the worker
    setProcessingStage('Updating node positions...')
    setProcessingProgress(80)

    // Process positions in batches to prevent UI freezing
    const positionEntries = Array.from(newPositions.entries())
    const batchSize = 100 // Adjust based on performance

    for (let i = 0; i < positionEntries.length; i += batchSize) {
      const batch = positionEntries.slice(i, i + batchSize)
      batch.forEach(([nodeId, position]) => {
        const [x, y] = position
        networkView.nodeViews[nodeId].x = x
        networkView.nodeViews[nodeId].y = y
      })

      // Update progress proportionally
      const progress =
        80 + Math.min(15, Math.floor((i / positionEntries.length) * 15))
      setProcessingProgress(progress)
      await yieldToUI()
    }

    // Step 5: Add view model
    setProcessingStage('Finalizing network view...')
    setProcessingProgress(95)
    addViewModel(newNetworkId, networkView)
    await yieldToUI()

    // Step 6: Apply default layout if needed
    if (interactionNetworkId === undefined || interactionNetworkId === '') {
      setProcessingStage('Applying layout...')

      // Make layout application async
      const applyLayoutAsync = (): Promise<void> => {
        return new Promise((resolve) => {
          const afterLayout = (
            positionMap: Map<IdType, [number, number]>,
          ): void => {
            updateNodePositions(network.id, positionMap)
            setIsRunning(false)
            resolve()
          }

          if (network !== undefined && engine !== undefined) {
            setIsRunning(true)
            engine.apply(
              network.nodes,
              network.edges,
              afterLayout,
              defaultLayout,
            )
          } else {
            resolve()
          }
        })
      }

      await applyLayoutAsync()
    }

    setProcessingProgress(100)
  }

  useEffect(() => {
    if (data === undefined) {
      return
    }

    // Define an async function for processing data
    const processData = async () => {
      try {
        setIsProcessing(true)
        setProcessingProgress(0)
        setProcessingStage('Initializing...')

        const { network, otherAspects, nodeTable, edgeTable } = data

        await yieldToUI()
        setProcessingProgress(10)
        setProcessingStage('Processing filter configuration...')

        // Check optional data
        if (otherAspects !== undefined && otherAspects.length > 0) {
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

            // Process filters in chunks to avoid UI blocking
            const batchSize = 5
            for (let i = 0; i < filterConfigs.length; i += batchSize) {
              const batch = filterConfigs.slice(i, i + batchSize)
              batch.forEach((filterConfig: FilterConfig) => {
                addFilterConfig(filterConfig)
              })

              await yieldToUI()
            }
          }
        }

        setProcessingProgress(40)
        setProcessingStage('Registering network...')
        await yieldToUI()

        // Check if the network is already in the store
        const newUuid: string = network.id.toString()
        const queryNetwork: Network | undefined = networks.get(newUuid)
        if (queryNetwork === undefined) {
          // Call the async version of registerNetwork
          await registerNetwork(
            network,
            data.networkViews[0],
            data.nodeTable,
            data.edgeTable,
          )
        }

        setProcessingProgress(80)
        setProcessingStage('Finalizing...')
        await yieldToUI()

        // if (queryNetworkId === newUuid) {
        //   setProcessingProgress(100)
        //   setProcessingStage('Complete')
        //   await yieldToUI()
        //   setIsProcessing(false)
        //   return
        // }

        updateNetworkView()

        setProcessingProgress(100)
        setProcessingStage('Complete')
        await yieldToUI()
      } finally {
        setIsProcessing(false)
      }
    }

    // Start the async processing
    processData()

    // Cleanup function if the component unmounts during processing
    return () => {
      setIsProcessing(false)
    }
  }, [data])

  if (isFetching || isProcessing) {
    return (
      <MessagePanel
        message={
          isProcessing
            ? `Rendering network: (${processingProgress}%)`
            : `Loading network data:`
        }
        subMessage={isProcessing ? `${processingStage}` : `(${queryNetworkId})`}
        showProgress={isProcessing}
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
