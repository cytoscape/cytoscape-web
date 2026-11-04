import { HierarchyCircularNode } from 'd3-hierarchy'

import { findHierarchyNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/CirclePackingUtils'
import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'
import { IdType } from '@/models/IdType'

/** applyCpLayout's scale from circle coordinates to network coordinates. */
const SCALING_FACTOR = 40

/**
 * Positions for subnetwork nodes whose id is a leaf's member id, at that
 * leaf circle's centre.
 *
 * applyCpLayout matches leaves to nodes by name only. When a hierarchy's
 * `HCX::members` are numeric ids (MuSIC), the leaves carry the id
 * (`72-3d-257`) and the interconnect query returns nodes with those ids, so
 * no name matches and every node stays at (0, 0). Nodes `known` already
 * places are left out.
 */
export const positionsByMemberId = (
  root: HierarchyCircularNode<D3TreeNode>,
  subsystemId: IdType,
  nodeIds: ReadonlySet<IdType>,
  known: ReadonlyMap<IdType, [number, number]>,
): Map<IdType, [number, number]> => {
  const positions = new Map<IdType, [number, number]>()
  const subsystem = findHierarchyNode(subsystemId, root)
  if (subsystem === undefined) return positions
  subsystem.leaves().forEach((leaf) => {
    // Typed string, but numeric HCX::members arrive as numbers
    if (leaf.data.originalId === undefined) return
    const memberId: IdType = String(leaf.data.originalId)
    if (
      !nodeIds.has(memberId) ||
      known.has(memberId) ||
      positions.has(memberId)
    ) {
      return
    }
    positions.set(memberId, [leaf.x * SCALING_FACTOR, leaf.y * SCALING_FACTOR])
  })
  return positions
}
