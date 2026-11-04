import { HierarchyCircularNode } from 'd3-hierarchy'

import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'
import { CirclePackingView } from '@/features/HierarchyViewer/model/CirclePackingView'
import { SubsystemTag } from '@/features/HierarchyViewer/model/HcxMetaTag'
import {
  createFilterFromAspect,
  findFilterAspect,
} from '@/features/HierarchyViewer/utils/getFilterAspect'
import { applyCpLayout } from '@/features/HierarchyViewer/utils/hierarchyUtil'
import {
  getSubNetworkId,
  isValidNetworkAndViews,
} from '@/features/HierarchyViewer/utils/subnetworkQueryUtil'
import { Cx2 } from '@/models/CxModel/Cx2'
import { getCyNetworkFromCx2 } from '@/models/CxModel/impl/converter'
import { CyNetwork } from '@/models/CyNetworkModel'
import { FilterConfig } from '@/models/FilterModel'
import { IdType } from '@/models/IdType'
import { Table } from '@/models/TableModel'

import { buildDrawing, Drawing } from '../drawing'
import { fetchCx2, fetchInterconnect } from '../ndexRequests'
import { positionsByMemberId } from './cpPositions'

// Runs in the prepare worker: nothing here may touch the DOM.

export interface Subsystem {
  cyNetwork: CyNetwork
  /** Node positions from the subsystem's circles in the Cell View. */
  positions: Map<IdType, [number, number]>
  /** From the interaction network's `filterWidgets` aspect, if any. */
  filterConfig?: FilterConfig
  /** The network styled and placed at `positions`, ready to draw. */
  drawing: Drawing
}

/** Where one subsystem's interaction network comes from. */
export type SubsystemRequest =
  | { uuid: IdType }
  | { rootNetworkId: IdType; members: number[] }

/**
 * How SubNetworkPanel.tsx fetches a subsystem's interaction network:
 *
 * - A subsystem node with `HCX::interactionNetworkUUID` is fetched by UUID.
 * - Otherwise NDEx runs an interconnect query on the hierarchy's interaction
 *   network with the subsystem's `HCX::members`.
 *
 * Returns undefined when the subsystem has neither a UUID nor members.
 */
export const subsystemRequest = (
  hierarchyNodeTable: Table,
  subsystemId: IdType,
  rootNetworkId: IdType,
): SubsystemRequest | undefined => {
  const row = hierarchyNodeTable.rows.get(subsystemId)
  const members = (row?.[SubsystemTag.members] as number[] | undefined) ?? []
  const uuid =
    (row?.[SubsystemTag.interactionNetworkUuid] as string | undefined) ?? ''
  if (uuid !== '') return { uuid }
  if (members.length === 0) return undefined
  return { rootNetworkId, members: members.map(Number) }
}

export const fetchSubsystemCx2 = (
  request: SubsystemRequest,
  host: string,
  signal?: AbortSignal,
): Promise<Cx2> =>
  'uuid' in request
    ? fetchCx2(request.uuid, { host, signal })
    : fetchInterconnect(request.rootNetworkId, request.members, {
        host,
        signal,
      })

/**
 * Turn one subsystem's interaction network into a network, lay it out on
 * the subsystem's circles in the Cell View, and build its drawing.
 *
 * Positions: applyCpLayout matches leaves to nodes by name,
 * positionsByMemberId by member id. The full app also runs its preferred
 * layout on interconnect results; the embed does not.
 *
 * `cellView` may be a structured clone. Throws when the CX2 does not
 * convert to a consistent network.
 */
export const loadSubsystem = ({
  hierarchyId,
  subsystemId,
  cx2,
  cellView,
}: {
  hierarchyId: IdType
  subsystemId: IdType
  cx2: Cx2
  cellView: CirclePackingView
}): Subsystem => {
  const cyNetwork = getCyNetworkFromCx2(
    getSubNetworkId(hierarchyId, subsystemId),
    cx2,
  )
  if (!isValidNetworkAndViews(cyNetwork.network, cyNetwork.networkViews)) {
    throw new Error('The network and its view do not match.')
  }

  const positions = applyCpLayout(
    cellView,
    subsystemId,
    cyNetwork.network.id,
    cyNetwork.nodeTable,
    cyNetwork.networkViews[0].nodeViews,
  )
  positionsByMemberId(
    cellView.hierarchy as HierarchyCircularNode<D3TreeNode>,
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

  return {
    cyNetwork,
    positions,
    filterConfig,
    drawing: buildDrawing(cyNetwork, positions),
  }
}
