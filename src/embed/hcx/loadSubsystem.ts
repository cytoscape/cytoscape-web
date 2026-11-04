import {
  createFilterFromAspect,
  findFilterAspect,
} from '@/features/HierarchyViewer/utils/getFilterAspect'
import { applyCpLayout } from '@/features/HierarchyViewer/utils/hierarchyUtil'
import { fetchNdexSubnetworkByQuery } from '@/features/HierarchyViewer/utils/subnetworkQueryUtil'
import { SubsystemTag } from '@/features/HierarchyViewer/model/HcxMetaTag'
import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { FilterConfig } from '@/models/FilterModel'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { Table } from '@/models/TableModel'

import { cellViewRoot } from './buildCellView'
import { positionsByMemberId } from './cpPositions'

export interface Subsystem {
  cyNetwork: CyNetwork
  /** Node positions from the subsystem's circles in the Cell View. */
  positions: Map<IdType, [number, number]>
  /** From the interaction network's `filterWidgets` aspect, if any. */
  filterConfig?: FilterConfig
}

/**
 * Fetch the interaction network of one subsystem and lay it out, as
 * SubNetworkPanel.tsx does:
 *
 * - A subsystem node with `HCX::interactionNetworkUUID` is fetched by UUID.
 * - Otherwise NDEx runs an interconnect query on the hierarchy's interaction
 *   network with the subsystem's `HCX::members`.
 *
 * Positions come from the subsystem's leaf circles: applyCpLayout matches
 * them by name, positionsByMemberId by member id. The full app also runs
 * its preferred layout on interconnect results; the embed does not.
 *
 * Returns undefined when the subsystem has neither a UUID nor members.
 */
export const loadSubsystem = async ({
  hierarchyId,
  subsystemId,
  hierarchyNodeTable,
  rootNetworkId,
  ndexUrl,
  cellView,
}: {
  hierarchyId: IdType
  subsystemId: IdType
  hierarchyNodeTable: Table
  rootNetworkId: IdType
  ndexUrl: string
  cellView: CirclePackingView
}): Promise<Subsystem | undefined> => {
  const row = hierarchyNodeTable.rows.get(subsystemId)
  const members = (row?.[SubsystemTag.members] as number[] | undefined) ?? []
  const interactionUuid =
    (row?.[SubsystemTag.interactionNetworkUuid] as string | undefined) ?? ''
  if (interactionUuid === '' && members.length === 0) {
    return undefined
  }

  const cyNetwork = await fetchNdexSubnetworkByQuery([
    hierarchyId,
    ndexUrl,
    rootNetworkId,
    subsystemId,
    members.join(','),
    interactionUuid,
    '',
  ])

  const positions = applyCpLayout(
    cellView,
    subsystemId,
    cyNetwork.network.id,
    cyNetwork.nodeTable,
    cyNetwork.networkViews[0].nodeViews,
  )
  positionsByMemberId(
    cellViewRoot(cellView),
    subsystemId,
    new Set(cyNetwork.network.nodes.map((n) => n.id)),
    positions,
  ).forEach((position, nodeId) => positions.set(nodeId, position))

  const aspect = findFilterAspect(cyNetwork.otherAspects ?? [])
  const filterConfig =
    aspect === undefined
      ? undefined
      : createFilterFromAspect(
          cyNetwork.network.id,
          aspect.value,
          cyNetwork.nodeTable,
          cyNetwork.edgeTable,
        )

  return { cyNetwork, positions, filterConfig }
}
