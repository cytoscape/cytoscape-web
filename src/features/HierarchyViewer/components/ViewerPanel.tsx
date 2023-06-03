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

export const ViewerPanel = (): JSX.Element => {
  const [panes, setPanes] = useState([0, 1])

  // Check the network property and enable the UI only if it is a hierarchy
  const [isHierarchy, setIsHierarchy] = useState<boolean>(false)
  const [metadata, setMetadata] = useState<HcxMetaData>()

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const { nodeTable } = useTableStore((state) => state.tables[currentNetworkId])

  // View model is required to extract the selected nodes
  const networkViewModel: NetworkView = useViewModelStore(
    (state) => state.viewModels[currentNetworkId],
  )

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  useEffect(() => {
    if (networkSummary === undefined) {
      return
    }
    const summary: NdexNetworkSummary = networkSummary

    const networkProps: NdexNetworkProperty[] = summary.properties

    const networkPropObj = networkProps.reduce<{ [key: string]: ValueType }>(
      (acc, prop) => {
        acc[prop.predicateString] = prop.value
        return acc
      },
      {},
    )
    const metadata: HcxMetaData | undefined = getHcxProps(networkPropObj)
    console.log(
      '###currentNetworkId and summary',
      currentNetworkId,
      summary,
      isHierarchy,
      metadata,
    )

    if (metadata !== undefined) {
      setIsHierarchy(true)
      setMetadata(metadata)
    }
  }, [currentNetworkId])

  if (!isHierarchy) {
    return <MessagePanel message="Not a hierarchy" />
  }

  const selectedNodes: IdType[] =
    networkViewModel !== undefined ? networkViewModel.selectedNodes : []

  if (selectedNodes.length === 0) {
    return <MessagePanel message="Please select a subsystem" />
  }

  // Pick the first selected node if multiple nodes are selected
  const selectedSubsystem: IdType = selectedNodes[0]
  const rows = nodeTable.rows

  // Pick the table row for the selected subsystem and extract member list
  const row: Record<string, ValueType> | undefined = rows.get(selectedSubsystem)

  if (row === undefined) {
    return <MessagePanel message="Invalid subsystem" />
  }

  const memberIds = row[SubsystemTag.members]
  console.log('Selected Row', row, memberIds)

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Allotment vertical minSize={100}>
        <Allotment.Pane>
          <SubNetworkPanel
            networkId={currentNetworkId}
            interactionNetworkId={metadata?.interactionNetworkUUID ?? ''}
            memberIds={memberIds as number[]}
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
