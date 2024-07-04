import { Core } from 'cytoscape'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import { cyNetDag2tree2, findRoot } from './DataBuilderUtil'
import { D3TreeNode } from './D3TreeNode'
import { NetworkView, NodeView } from '../../../../models/ViewModel'
import { CirclePackingView } from '../../model/CirclePackingView'

/**
 * Return the branch of the network rooted at the given node
 *
 * @param network
 * @param nodeId
 * @returns Edge list of the children of the node
 */
export const createTreeLayout = (
  network: Network,
  nodeTable: Table,
): HierarchyNode<D3TreeNode> => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core
  const root = findRoot(cyNet)
  const treeElementList: any[] = []
  const visited3: { [key: string]: number } = {}

  const allMembers = new Set<string>()
  cyNetDag2tree2(
    root,
    null,
    cyNet,
    nodeTable,
    visited3,
    treeElementList,
    allMembers,
  )
  try {
    const hierarchyRootNode: HierarchyNode<D3TreeNode> =
      d3Hierarchy.stratify<D3TreeNode>()(treeElementList)
    // countAllChildren(hierarchyRootNode)

    // hierarchyRootNode.sum((d: D3TreeNode) => d.members.length)
    hierarchyRootNode
      .sum((d: D3TreeNode) => 1)
      .sort((a, b) => {
        const valA = a.value as number
        const valB = b.value as number
        return valB - valA
      })
    return hierarchyRootNode
  } catch (e) {
    console.error('Failed to build tree,', e)
    throw e
  }
  // hierarchyRootNode.sum((d: D3TreeNode) => Math.floor(Math.random() * 100))
}

export const CirclePackingType = 'circlePacking'

/**
 * Create a circle packing view from default network view
 *
 * @param primaryView NetworkView as a node-link diagram
 * @param root Root node of the hierarchy
 *
 * @returns
 */
export const createCirclePackingView = (
  primaryView: NetworkView,
  root: HierarchyNode<D3TreeNode>,
  width: number,
  height: number,
): CirclePackingView => {
  const pack: d3Hierarchy.PackLayout<any> = d3Hierarchy
    .pack()
    .size([width, height])
    .padding(0)
  pack(root)

  const nodePositions = new Map<string, { x: number; y: number }>()
  copyLeafPositions(root, nodePositions)

  const originalNodeViews: Record<string, NodeView> = primaryView.nodeViews
  const nodeViewsWithLeaves: Record<string, NodeView> = {
    ...originalNodeViews,
  }

  nodePositions.forEach((pos: { x: number; y: number }, nodeId) => {
    nodeViewsWithLeaves[nodeId] = {
      id: nodeId,
      x: pos.x,
      y: pos.y,
      values: new Map(),
    }
  })

  const cpView: CirclePackingView = {
    ...primaryView,
    nodeViews: nodeViewsWithLeaves,
    type: CirclePackingType,
    viewId: `${primaryView.id}-${CirclePackingType}-1`, // TODO: make this auto-generated
    hierarchy: root,
  }

  return cpView
}

const copyLeafPositions = (
  node: HierarchyNode<D3TreeNode>,
  nodePositions: Map<string, { x: number; y: number }>,
): void => {
  if (node.children) {
    const children = node.children as HierarchyNode<D3TreeNode>[]
    children.forEach((child) => {
      copyLeafPositions(child, nodePositions)
    })
  } else {
    nodePositions.set(node.data.id, { x: node.x ?? 0, y: node.y ?? 0 })
  }
}
