import { useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'
import { Box } from '@mui/material'
import { SubNetworkPanel } from './SubNetworkPanel'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { HcxMetaData } from '../model/HcxMetaData'
import { getHcxMetadata } from '../utils/hierarchy-util'
import { ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { SubsystemTag } from '../model/HcxMetaTag'
import { Network } from '../../../models/NetworkModel'
import { CirclePackingPanel } from './CustomLayout/CirclePackingPanel'
import { Renderer } from '../../../models/RendererModel/Renderer'
import { useRendererStore } from '../../../store/RendererStore'
import { PropertyPanel } from './PropertyPanel/PropertyPanel'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../../store/VisualStyleStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FilterPanel from './FilterPanel/FilterPanel'
import { DuplicateNodeSeparator } from './CustomLayout/DataBuilderUtil'
import { useSubNetworkStore } from '../store/SubNetworkStore'

export const RENDERER_TAG: string = 'secondary'
export interface Query {
  nodeIds: number[]
}

const queryClient = new QueryClient()

export const CP_RENDERER_ID: string = 'circlePacking'

export const MainPanel = (): JSX.Element => {
  const [subNetworkName, setSubNetworkName] = useState<string>('')
  const [query, setQuery] = useState<Query>({ nodeIds: [] })
  const [interactionNetworkUuid, setInteractionNetworkId] = useState<string>('')

  // Check the network property and enable the UI only if it is a hierarchy
  const [isHierarchy, setIsHierarchy] = useState<boolean>(false)
  const [metadata, setMetadata] = useState<HcxMetaData>()

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const visualStyles: Record<string, VisualStyle> = useVisualStyleStore(
    (state) => state.visualStyles,
  )

  const tableRecord = useTableStore((state) => state.tables[currentNetworkId])

  // View model is required to extract the selected nodes
  const networkViewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  // Selected nodes in the hierarchy
  const selectedNodes: IdType[] = networkViewModel?.selectedNodes ?? []

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const addRenderer = useRendererStore((state) => state.add)
  const renderers = useRendererStore((state) => state.renderers)

  const setRootNetworkId = useSubNetworkStore((state) => state.setRootNetworkId)
  const setRootNetworkHost = useSubNetworkStore(
    (state) => state.setRootNetworkHost,
  )

  const CirclePackingRenderer: Renderer = {
    id: CP_RENDERER_ID,
    name: 'Cell View',
    description: 'Circle Packing Renderer',
    getComponent: (
      networkData: Network,
      initialSize: { w: number; h: number },
      visible: boolean,
    ) => (
      <CirclePackingPanel
        rendererId={CP_RENDERER_ID}
        network={networkData}
        initialSize={initialSize}
        visible={visible}
      />
    ),
  }

  const checkDataType = (): void => {
    const metadata: HcxMetaData | undefined = getHcxMetadata(networkSummary)

    if (metadata !== undefined) {
      setIsHierarchy(true)
      setMetadata(metadata)
      // Add the CP renderer if it does not exist
      if (renderers.circlePacking === undefined) {
        addRenderer(CirclePackingRenderer)
      }
    } else {
      setIsHierarchy(false)
      setMetadata(undefined)
    }
  }

  useEffect(() => {
    checkDataType()
  }, [networkSummary])

  useEffect(() => {
    checkDataType()
  }, [currentNetworkId])

  useEffect(() => {
    // Pick the first selected node if multiple nodes are selected
    const selectedSubsystem: IdType = selectedNodes[0]
    if (selectedSubsystem === undefined || tableRecord === undefined) {
      return
    }

    const idString: string = selectedSubsystem.toString()
    const { nodeTable } = tableRecord
    const rows = nodeTable.rows

    // Pick the table row for the selected subsystem and extract member list
    const row: Record<string, ValueType> | undefined = rows.get(idString)
    if (row === undefined) {
      return
    }

    const memberIds = row[SubsystemTag.members]
    const interactionUuid: string = row[
      SubsystemTag.interactionNetworkUuid
    ] as string

    const visualStyle: VisualStyle = visualStyles[currentNetworkId]
    const nodeLabelMappingAttr: string | undefined =
      visualStyle.nodeLabel.mapping?.attribute

    let nameVal = row['name']
    if (nodeLabelMappingAttr !== undefined) {
      const mappedVal = row[nodeLabelMappingAttr]
      if (mappedVal !== undefined) {
        nameVal = mappedVal
      }
    }
    // const name: ValueType = nodeLabelMappingAttr !== undefined ? row.nodeLabelMappingAttr : row.name
    setSubNetworkName(nameVal.toString())
    const newQuery: Query = { nodeIds: memberIds as number[] }
    if (interactionUuid === undefined || interactionUuid === '') {
      setQuery(newQuery)
    }
    setInteractionNetworkId(interactionUuid)
  }, [selectedNodes])

  useEffect(() => {
    if (
      metadata !== undefined &&
      metadata.interactionNetworkUUID !== undefined
    ) {
      setRootNetworkId(metadata.interactionNetworkUUID)
      setRootNetworkHost(metadata.interactionNetworkHost ?? '')
    }
  }, [metadata])

  if (!isHierarchy) {
    return <MessagePanel message="This network is not a hierarchy" />
  }

  if (selectedNodes.length === 0) {
    return <MessagePanel message="Please select a subsystem" />
  }

  // This is the ID of the selected subsystem in the hierarchy
  let targetNode: IdType = selectedNodes[0]

  if (selectedNodes.length > 1) {
    // Multiple nodes are selected
    // Check if same branches are selected
    const normalizedIds = selectedNodes.map((nodeId) => {
      return nodeId.split(DuplicateNodeSeparator)[0]
    })
    const uniqueBranches = new Set(normalizedIds)
    if (uniqueBranches.size !== 1) {
      return (
        <MessagePanel
          message="Multiple nodes are selected"
          subMessage="Please select one subsystem to display the associated interactions"
        />
      )
    } else {
      targetNode = Array.from(uniqueBranches)[0]
    }
  }

  // Special case: neither of ID or membership is available
  if (
    (interactionNetworkUuid === undefined || interactionNetworkUuid === '') &&
    (query.nodeIds === undefined || query.nodeIds.length === 0)
  ) {
    return (
      <MessagePanel message="Network data is not available for the selected node" />
    )
  }

  const rootNetworkId: IdType = metadata?.interactionNetworkUUID ?? ''
  const interactionNetworkHost: string = metadata?.interactionNetworkHost ?? ''

  return (
    <QueryClientProvider client={queryClient}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Allotment vertical minSize={100}>
          <Allotment.Pane preferredSize={'65%'}>
            <SubNetworkPanel
              hierarchyId={currentNetworkId}
              subNetworkName={subNetworkName}
              rootNetworkId={rootNetworkId}
              subsystemNodeId={targetNode}
              query={query}
              interactionNetworkId={interactionNetworkUuid}
              interactionNetworkHost={interactionNetworkHost}
            />
          </Allotment.Pane>
          <Allotment.Pane>
            <Allotment>
              <Allotment.Pane preferredSize={'15%'} key={0}>
                <PropertyPanel networkId={targetNode} />
              </Allotment.Pane>
              <Allotment.Pane key={1}>
                <FilterPanel />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </Box>
    </QueryClientProvider>
  )
}
