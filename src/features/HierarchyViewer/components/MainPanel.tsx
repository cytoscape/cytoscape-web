import { useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'
import { Box } from '@mui/material'
import { SubNetworkPanel } from './SubNetworkPanel'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { HcxMetaData } from '../model/HcxMetaData'
import { getHcxProps } from '../utils/hierarchy-util'
import {
  NdexNetworkProperty,
  NdexNetworkSummary,
} from '../../../models/NetworkSummaryModel'
import { ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { SubsystemTag } from '../model/HcxMetaTag'
// import { PropertyPanel } from './PropertyPanel/PropertyPanel'
import { SharedStyleManager } from './PropertyPanel/SharedStyleManager'
// import { createTreeLayout } from './CustomLayout/CirclePackingLayout'
import { Network } from '../../../models/NetworkModel'
import { useNetworkStore } from '../../../store/NetworkStore'
import { CirclePackingPanel } from './CustomLayout/CirclePackingPanel'
import { Renderer } from '../../../models/RendererModel/Renderer'
import { useRendererStore } from '../../../store/RendererStore'
import { PropertyPanel } from './PropertyPanel/PropertyPanel'

export const RENDERER_TAG: string = 'secondary'
export interface Query {
  nodeIds: number[]
}

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

  const currentNetwork: Network | undefined = useNetworkStore((state) =>
    state.networks.get(currentNetworkId),
  )

  const tableRecord = useTableStore((state) => state.tables[currentNetworkId])

  // View model is required to extract the selected nodes
  const networkViewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )

  // Selected nodes in the hierarchy
  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )
  const addRenderer = useRendererStore((state) => state.add)
  const deleteRenderer = useRendererStore((state) => state.delete)
  const renderers = useRendererStore((state) => state.renderers)

  const checkDataType = (): void => {
    // Check if the current network is a hierarchy
    if (networkSummary === undefined) {
      return
    }
    const summary: NdexNetworkSummary = networkSummary
    const networkProps: NdexNetworkProperty[] = summary.properties
    if (networkProps === undefined || networkProps.length === 0) {
      setIsHierarchy(false)
      setMetadata(undefined)
      return
    }

    const networkPropObj: Record<string, ValueType> = networkProps.reduce<{
      [key: string]: ValueType
    }>((acc, prop) => {
      acc[prop.predicateString] = prop.value
      return acc
    }, {})
    const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)

    if (metadata !== undefined) {
      setIsHierarchy(true)
      setMetadata(metadata)
    } else {
      setIsHierarchy(false)
      setMetadata(undefined)
      if(renderers.circlePacking !== undefined) {
        deleteRenderer(renderers.circlePacking.id)
      }
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

    // For Circle Packing: build circle packing layout
    // if (currentNetwork !== undefined) {
    //   createTreeLayout(currentNetwork, nodeTable)
    // }

    // Pick the table row for the selected subsystem and extract member list
    const row: Record<string, ValueType> | undefined = rows.get(idString)
    if (row === undefined) {
      return
    }

    const memberIds = row[SubsystemTag.members]
    const interactionUuid: string = row[
      SubsystemTag.interactionNetworkUuid
    ] as string

    const name: ValueType = row.name ?? '?'
    setSubNetworkName(name as string)
    const newQuery: Query = { nodeIds: memberIds as number[] }
    if (interactionUuid === undefined || interactionUuid === '') {
      setQuery(newQuery)
    }
    setInteractionNetworkId(interactionUuid)
  }, [selectedNodes])

  if (!isHierarchy) {
    
    return <MessagePanel message="This network is not a hierarchy" />
  }

  if (selectedNodes.length === 0) {
    return <MessagePanel message="Please select a subsystem" />
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

  // This is the ID of the selected subsystem in the hierarchy
  const targetNode: IdType = selectedNodes[0]
  const rootNetworkId: IdType = metadata?.interactionNetworkUUID ?? ''

  const CirclePackingRenderer: Renderer = {
    id: 'circlePacking',
    name: 'Circle Packing Renderer',
    description: 'Circle Packing Renderer',
    getComponent: (networkData: Network) => (
      <CirclePackingPanel
        network={currentNetwork}
        nodeTable={tableRecord?.nodeTable}
        selected={targetNode}
      />
    ),
  }

  if(renderers.circlePacking === undefined) {
    addRenderer(CirclePackingRenderer)
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel
            hierarchyId={currentNetworkId}
            subNetworkName={subNetworkName}
            rootNetworkId={rootNetworkId}
            subsystemNodeId={targetNode}
            query={query}
            interactionNetworkId={interactionNetworkUuid}
          />
        </Allotment.Pane>
        <Allotment.Pane preferredSize={100}>
          <Allotment>
            <Allotment.Pane preferredSize={'15%'} key={0}>
              <PropertyPanel networkId={targetNode} />
            </Allotment.Pane>
            <Allotment.Pane key={1}>
              <SharedStyleManager
                networkId={targetNode}
                rootNetworkId={rootNetworkId}
              />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
