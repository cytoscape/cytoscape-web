import { HierarchyCircularNode } from 'd3-hierarchy'

import { D3TreeNode } from '@/features/HierarchyViewer/components/CirclePackingLayout/D3TreeNode'
import { IdType } from '@/models/IdType'

type Circle = HierarchyCircularNode<D3TreeNode>

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
 *
 * Walks `children` rather than calling d3's methods, so `root` may be a
 * structured clone posted to a Web Worker.
 */
export const positionsByMemberId = (
  root: Circle,
  subsystemId: IdType,
  nodeIds: ReadonlySet<IdType>,
  known: ReadonlyMap<IdType, [number, number]>,
): Map<IdType, [number, number]> => {
  const positions = new Map<IdType, [number, number]>()
  const subsystem = find(root, (circle) => circle.data.id === subsystemId)
  if (subsystem === undefined) return positions
  leavesOf(subsystem).forEach((leaf) => {
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

const find = (
  root: Circle,
  test: (circle: Circle) => boolean,
): Circle | undefined => {
  const stack = [root]
  while (stack.length > 0) {
    const circle = stack.pop()!
    if (test(circle)) return circle
    stack.push(...((circle.children as Circle[] | undefined) ?? []))
  }
  return undefined
}

const leavesOf = (root: Circle): Circle[] => {
  const leaves: Circle[] = []
  const stack = [root]
  while (stack.length > 0) {
    const circle = stack.pop()!
    const children = circle.children as Circle[] | undefined
    if (children === undefined || children.length === 0) leaves.push(circle)
    // Reversed onto the stack, so leaves come in d3's leaves() order
    else stack.push(...[...children].reverse())
  }
  return leaves
}
