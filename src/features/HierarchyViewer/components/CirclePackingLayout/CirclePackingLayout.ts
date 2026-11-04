import { Core, NodeSingular } from 'cytoscape'
import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'

import { logUi } from '../../../../debug'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'
import { NetworkView, NodeView } from '../../../../models/ViewModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { D3TreeNode } from './D3TreeNode'
import { cyNetDag2tree2, findRoot, getMembers } from './DataBuilderUtil'
import { resolveMemberNames } from './memberNames'

/**
 * Return the branch of the network rooted at the given node
 *
 * @param network
 * @param nodeId
 * @returns Edge list of the children of the node
 */
export const createTreeLayout = async ({
  network,
  nodeTable,
  interactionNetworkId,
  interactionNetworkHostUrl,
  getToken,
}: {
  network: Network
  nodeTable: Table
  // Interaction network the member ids are looked up in, from this
  // hierarchy's HCX metadata. Undefined when it names none.
  interactionNetworkId: string | undefined
  interactionNetworkHostUrl: string
  getToken: () => Promise<string>
}): Promise<HierarchyNode<D3TreeNode>> => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core
  const root: NodeSingular | undefined = findRoot(cyNet)
  if (root === undefined) {
    // Not a single-rooted tree / DAG. Return the empty sentinel so the caller
    // can report it instead of crashing (issue #630).
    logUi.warn(
      `[${createTreeLayout.name}]: Cannot build the hierarchy without a single root`,
    )
    return {} as HierarchyNode<D3TreeNode>
  }
  const treeElementList: any[] = []
  const visited3: { [key: string]: number } = {}

  const allMembers = new Set<string>()

  // Protein names of the member ids, keyed by id. Empty when the members are
  // names already, or the lookup failed: the rings then show the ids.
  const id2name: Map<string, string> = await resolveMemberNames({
    members: getMembers(root.id(), nodeTable),
    interactionNetworkId,
    interactionNetworkHostUrl,
    getToken,
  })

  cyNetDag2tree2(
    root,
    null,
    nodeTable,
    visited3,
    treeElementList,
    allMembers,
    id2name,
  )

  try {
    const hierarchyRootNode: HierarchyNode<D3TreeNode> =
      d3Hierarchy.stratify<D3TreeNode>()(treeElementList)

    // hierarchyRootNode.sum((d: D3TreeNode) => d.members.length)
    hierarchyRootNode
      .sum(() => 1)
      .sort((a, b) => {
        const valA = a.value as number
        const valB = b.value as number
        return valB - valA
      })
    return hierarchyRootNode
  } catch (e) {
    logUi.error(`[${createTreeLayout.name}]: Failed to build D3 tree`, e)
    // throw e
    return {} as HierarchyNode<D3TreeNode>
  }
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
