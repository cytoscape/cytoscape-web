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

export const RENDERER_TAG: string = 'secondary'
export interface Query {
  nodeIds: number[]
}

export const ViewerPanel = (): JSX.Element => {
  // Panel state
  const [panes, setPanes] = useState([0, 1])
  const [query, setQuery] = useState<Query>({ nodeIds: [] })

  // Check the network property and enable the UI only if it is a hierarchy
  const [isHierarchy, setIsHierarchy] = useState<boolean>(false)
  const [metadata, setMetadata] = useState<HcxMetaData>()

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

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

  useEffect(() => {
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
    console.log('Selected Row', row, memberIds)
    const newQuery: Query = { nodeIds: memberIds as number[] }
    setQuery(newQuery)
  }, [selectedNodes])

  if (!isHierarchy) {
    return <MessagePanel message="This network is not a hierarchy" />
  }

  if (selectedNodes.length === 0) {
    return <MessagePanel message="Please select a subsystem" />
  }

  const handleFocus = (e: any): void => {
    console.log('### ViewerPanel focused', e)
  }
  return (
    <Box sx={{ width: '100%', height: '100%' }} onClick={handleFocus}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel
            rootNetworkId={metadata?.interactionNetworkUUID ?? ''}
            subsystemNodeId={selectedNodes[0]}
            query={query}
          />
        </Allotment.Pane>
        <Allotment.Pane maxSize={1000}>
          <Allotment>
            {panes.map((pane) => (
              <Allotment.Pane key={pane}>
                <MessagePanel message={`Property Panel ${pane + 1}`} />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPanes((panes) => {
                          const newPanes = [...panes]
                          newPanes.splice(pane, 1)
                          return newPanes
                        })
                      }
                    >
                      x
                    </button>
                  </div>
                </div>
              </Allotment.Pane>
            ))}
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </Box>
  )
}
