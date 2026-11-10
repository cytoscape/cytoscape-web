import { Box } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import { useMemo } from 'react'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { MessagePanel } from '../../Messages'
import { HcxMetaData } from '../model/HcxMetaData'
import { SubsystemTag } from '../model/HcxMetaTag'
import { useSubNetworkStore } from '../store/SubNetworkStore'
import { getHcxMetadata } from '../utils/hierarchyUtil'
import { getSubNetworkId } from '../utils/subnetworkQueryUtil'
import { getSubsystemName } from '../utils/subsystemName'
import { DuplicateNodeSeparator } from './CirclePackingLayout/DataBuilderUtil'
import FilterPanel from './FilterPanel/FilterPanel'
import { PropertyPanel } from './PropertyPanel/PropertyPanel'
import { SubNetworkPanel } from './SubNetworkPanel'

export const RENDERER_TAG: string = 'secondary'
export interface Query {
  nodeIds: number[]
}

const queryClient = new QueryClient()

const NO_SUBSYSTEM: {
  subNetworkName: string
  query: Query
  interactionNetworkUuid: string
} = { subNetworkName: '', query: { nodeIds: [] }, interactionNetworkUuid: '' }

export const MainPanel = (): JSX.Element => {
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

  // Selected nodes in the hierarchy. Memoized so the effect below re-runs
  // only when the view model actually changes (Immer's structural sharing
  // keeps .selectedNodes identity stable across unrelated updates), not on
  // every render via a fresh `?? []` array.
  const selectedNodes: IdType[] = useMemo(
    () => networkViewModel?.selectedNodes ?? [],
    [networkViewModel],
  )

  // At this point, summary can be any network prop object
  const networkSummary: any = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  // Check the network property and enable the UI only if it is a hierarchy
  const metadata: HcxMetaData | undefined = getHcxMetadata(networkSummary)

  // ID the shown subnetwork is stored under (`<hierarchyId>_<subsystemNodeId>`).
  // Empty until SubNetworkPanel has loaded it.
  const currentSubNetworkId: IdType = useSubNetworkStore(
    (state) => state.currentSubNetworkId,
  )

  // Whether the shown subnetwork has a filter (only those whose CX carries a
  // `filterWidgets` aspect do). Decides whether the bottom pane splits into
  // properties and filter.
  const subNetworkHasFilter: boolean = useFilterStore(
    (state) => state.filterConfigs[currentSubNetworkId] !== undefined,
  )

  // Derived during render and not in an effect: SubNetworkPanel fetches as soon as
  // it gets a subsystem, so a render that pairs it with the previous subsystem's
  // members starts a wrong fetch. When that answer came first, it was stored as
  // this subsystem's network for good (#931).
  const { subNetworkName, query, interactionNetworkUuid } = useMemo(() => {
    // Pick the first selected node if multiple nodes are selected
    const selectedSubsystem: IdType = selectedNodes[0]
    if (selectedSubsystem === undefined || tableRecord === undefined) {
      return NO_SUBSYSTEM
    }

    const idString: string = selectedSubsystem.toString()
    const { nodeTable } = tableRecord
    const rows = nodeTable.rows

    // Pick the table row for the selected subsystem and extract member list
    const row: Record<string, ValueType> | undefined = rows.get(idString)
    if (row === undefined) {
      return NO_SUBSYSTEM
    }

    const visualStyle: VisualStyle | undefined = visualStyles[currentNetworkId]
    const nodeLabelMappingAttr: string | undefined =
      visualStyle?.nodeLabel?.mapping?.attribute

    return {
      subNetworkName: getSubsystemName(row, nodeLabelMappingAttr, idString),
      query: { nodeIds: row[SubsystemTag.members] as number[] },
      interactionNetworkUuid: row[
        SubsystemTag.interactionNetworkUuid
      ] as string,
    }
  }, [selectedNodes, tableRecord, visualStyles, currentNetworkId])

  if (metadata === undefined) {
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

  // The store still names the previous subnetwork while the selected one loads
  // or after its fetch fails. Show no properties until they match.
  const propertyNetworkId: IdType =
    currentSubNetworkId === getSubNetworkId(currentNetworkId, targetNode)
      ? currentSubNetworkId
      : ''

  // Split only when there is a filter; without one, the property panel and its
  // messages take the full width. The filter stays regardless of selection:
  // its checkboxes hide elements, and hiding it would strand them.
  const showFilterPanel: boolean =
    propertyNetworkId !== '' && subNetworkHasFilter

  const rootNetworkId: IdType = metadata.interactionNetworkUUID ?? ''
  const interactionNetworkHost: string = metadata.interactionNetworkHost ?? ''

  return (
    <QueryClientProvider client={queryClient}>
      <Box
        data-testid="hierarchy-viewer-main-panel"
        sx={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
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
            <Box
              sx={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                borderTop: (theme) => `2px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.background.paper,
              }}
            >
              {showFilterPanel ? (
                <Allotment>
                  <Allotment.Pane preferredSize={'40%'} key={0}>
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        borderRight: (theme) =>
                          `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <PropertyPanel networkId={propertyNetworkId} />
                    </Box>
                  </Allotment.Pane>
                  <Allotment.Pane key={1}>
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        borderLeft: (theme) =>
                          `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <FilterPanel networkId={propertyNetworkId} />
                    </Box>
                  </Allotment.Pane>
                </Allotment>
              ) : (
                <PropertyPanel networkId={propertyNetworkId} />
              )}
            </Box>
          </Allotment.Pane>
        </Allotment>
      </Box>
    </QueryClientProvider>
  )
}
