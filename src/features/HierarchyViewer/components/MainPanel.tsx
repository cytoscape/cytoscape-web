import { Box } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { logUi } from '../../../debug'
import { FilterUrlParams } from '../../../models/FilterModel/FilterUrlParams'
import { IdType } from '../../../models/IdType'
import { Network } from '../../../models/NetworkModel'
import { Renderer } from '../../../models/RendererModel/Renderer'
import { Table, ValueType } from '../../../models/TableModel'
import { NetworkView } from '../../../models/ViewModel'
import { VisualStyle } from '../../../models/VisualStyleModel'
import { MessagePanel } from '../../Messages'
import { HcxMetaData } from '../model/HcxMetaData'
import { SubsystemTag } from '../model/HcxMetaTag'
import {
  hasUniformEdgeInteraction,
  MIXED_INTERACTION_WARNING,
} from '../model/impl/circlePackingSupport'
import { useSubNetworkStore } from '../store/SubNetworkStore'
import { getHcxMetadata } from '../utils/hierarchyUtil'
import { getSubNetworkId } from '../utils/subnetworkQueryUtil'
import { CirclePackingPanel } from './CirclePackingLayout/CirclePackingPanel'
import { DuplicateNodeSeparator } from './CirclePackingLayout/DataBuilderUtil'
import FilterPanel from './FilterPanel/FilterPanel'
import { PropertyPanel } from './PropertyPanel/PropertyPanel'
import { SubNetworkPanel } from './SubNetworkPanel'

export const RENDERER_TAG: string = 'secondary'
export interface Query {
  nodeIds: number[]
}

const queryClient = new QueryClient()

export const CP_RENDERER_ID: string = 'circlePacking'

// Module-scope so the renderer object keeps a stable identity across renders
const CirclePackingRenderer: Renderer = {
  id: CP_RENDERER_ID,
  name: 'Cell View',
  description: 'Circle Packing Renderer',
  getComponent: (
    networkData: Network,
    initialSize = { w: 0, h: 0 },
    visible = true,
  ) => (
    <CirclePackingPanel
      rendererId={CP_RENDERER_ID}
      network={networkData}
      initialSize={initialSize}
      visible={visible}
    />
  ),
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
  const addRenderer = useRendererStore((state) => state.add)
  const deleteRenderer = useRendererStore((state) => state.delete)
  const renderers = useRendererStore((state) => state.renderers)

  const setRootNetworkId = useSubNetworkStore((state) => state.setRootNetworkId)
  const setRootNetworkHost = useSubNetworkStore(
    (state) => state.setRootNetworkHost,
  )

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

  // The filter's on/off switch. Kept here, not in FilterPanel, because
  // FilterPanel unmounts while a subsystem loads and for subsystems without a
  // filter; its own state would reset to "on" on every remount. Seeded once
  // from the URL (the app uses a browser router, so this matches
  // useSearchParams).
  const [isFilterEnabled, setIsFilterEnabled] = useState<boolean>(
    () =>
      new URLSearchParams(window.location.search).get(
        FilterUrlParams.FILTER_ENABLED,
      ) !== 'false',
  )

  const checkDataType = useCallback((): void => {
    const metadata: HcxMetaData | undefined = getHcxMetadata(networkSummary)

    if (metadata === undefined) {
      setIsHierarchy(false)
      setMetadata(undefined)
      return
    }

    setIsHierarchy(true)
    setMetadata(metadata)

    const edgeTable: Table | undefined = tableRecord?.edgeTable
    if (edgeTable === undefined) {
      // Tables have not been loaded yet: decide nothing. This effect re-runs
      // when the table record arrives.
      return
    }

    if (hasUniformEdgeInteraction(edgeTable)) {
      // Add the CP renderer if it does not exist
      if (renderers.circlePacking === undefined) {
        addRenderer(CirclePackingRenderer)
      }
    } else {
      // This hierarchy also contains non parent-child edges, which the circle
      // packing layout cannot interpret. Drop the Cell View tab instead of
      // rendering a wrong or empty diagram (issue #630).
      logUi.info(
        `[${MainPanel.name}]: ${MIXED_INTERACTION_WARNING}`,
        currentNetworkId,
      )
      if (renderers.circlePacking !== undefined) {
        deleteRenderer(renderers.circlePacking.id)
      }
    }
  }, [
    networkSummary,
    tableRecord,
    renderers,
    addRenderer,
    deleteRenderer,
    currentNetworkId,
  ])

  useEffect(() => {
    checkDataType()
  }, [networkSummary, currentNetworkId, checkDataType])

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

    const visualStyle: VisualStyle | undefined = visualStyles[currentNetworkId]
    const nodeLabelMappingAttr: string | undefined =
      visualStyle?.nodeLabel?.mapping?.attribute

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
  }, [selectedNodes, tableRecord, visualStyles, currentNetworkId])

  useEffect(() => {
    if (
      metadata !== undefined &&
      metadata.interactionNetworkUUID !== undefined
    ) {
      setRootNetworkId(metadata.interactionNetworkUUID)
      setRootNetworkHost(metadata.interactionNetworkHost ?? '')
    }
  }, [metadata, setRootNetworkId, setRootNetworkHost])

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

  const rootNetworkId: IdType = metadata?.interactionNetworkUUID ?? ''
  const interactionNetworkHost: string = metadata?.interactionNetworkHost ?? ''

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
                      <FilterPanel
                        networkId={propertyNetworkId}
                        enabled={isFilterEnabled}
                        onEnabledChange={setIsFilterEnabled}
                      />
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
