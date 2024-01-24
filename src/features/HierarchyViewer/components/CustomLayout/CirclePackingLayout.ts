import { Core } from 'cytoscape'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import { cyNetDag2tree2, findRoot } from './DataBuilderUtil'
import { D3TreeNode } from './D3TreeNode'
import { NetworkView } from '../../../../models/ViewModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { VisualStyle } from '../../../../models/VisualStyleModel'

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


export const CirclePackingType = 'circlePacking'

export const createCirclePackingView = (
  primaryView: NetworkView,
  root: HierarchyNode<D3TreeNode>,
): CirclePackingView => {
  const cpView: CirclePackingView = {
    id: primaryView.id,
    type: 'circlePacking',
    viewId: 'test',
    selectedNodes: primaryView.selectedNodes,
    selectedEdges: primaryView.selectedEdges,
    nodeViews: {},
    edgeViews: {},
    values: new Map(),
    hierarchy: root,
  }

  // add views to the CP view
  
  return cpView
}
