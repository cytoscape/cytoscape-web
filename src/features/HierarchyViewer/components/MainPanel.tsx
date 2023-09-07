import { useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import { MessagePanel } from '../../../components/Messages'
import { Box } from '@mui/material'
import { SubNetworkPanel } from './SubNetworkPanel'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { HcxMetaData } from '../model/HcxMetaData'
import { getHcxProps } from '../utils/hierarcy-util'
import {
  NdexNetworkProperty,
  NdexNetworkSummary,
} from '../../../models/NetworkSummaryModel'
import { ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { useTableStore } from '../../../store/TableStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { SubsystemTag } from '../model/HcxMetaTag'
import { PropertyPanel } from './PropertyPanel/PropertyPanel'
import { SharedStyleManager } from './PropertyPanel/SharedStyleManager'
// import { useNetworkStore } from '../../../store/NetworkStore'
// import { Network } from '../../../models/NetworkModel'

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

  // const currentNetwork: Network | undefined = useNetworkStore((state) =>
  //   state.networks.get(currentNetworkId),
  // )

  const tableRecord = useTableStore((state) => state.tables[currentNetworkId])

  // View model is required to extract the selected nodes
  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )

  // Selected nodes in the hierarchy
  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

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
    }
  }

  useEffect(() => {
    console.log('MainPanel: currentNetworkId', currentNetworkId, networkSummary)
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

    // Exract children
    // if (currentNetwork !== undefined) {
    //   createTreeLayout(currentNetwork, selectedSubsystem, nodeTable)
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

  const targetNode: IdType = selectedNodes[0]
  const rootNetworkId: IdType = metadata?.interactionNetworkUUID ?? ''

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel
            subNetworkName={subNetworkName}
            rootNetworkId={rootNetworkId}
            subsystemNodeId={targetNode}
            query={query}
            interactionNetworkId={interactionNetworkUuid}
          />
        </Allotment.Pane>
        <Allotment.Pane preferredSize={200}>
          <Allotment>
            <Allotment.Pane preferredSize={'35%'} key={0}>
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
