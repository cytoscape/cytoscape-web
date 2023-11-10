import { Core } from 'cytoscape'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import { cyNetDag2tree2, findRoot } from './DataBuilderUtil'
import { D3TreeNode } from './D3TreeNode'

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
  // hierarchyRootNode.sum((d: D3TreeNode) => Math.floor(Math.random() * 100))

  return hierarchyRootNode
}

// function countAllChildren(node: HierarchyNode<D3TreeNode>): number {
//   // Count the direct children of the node
//   const children: Array<HierarchyNode<D3TreeNode>> | undefined = node.children
//   let size = 0
//   if (children === undefined) {
//     node.data.value = 1
//     return 1
//   }

//   // For each child, recursively count its children
//   children.forEach((child) => {
//     count += countAllChildren(child)
//   })

//   // Return the total count of children
//   node.data.value = count
//   return count
// }
