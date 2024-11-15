import { Core } from 'cytoscape'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import { cyNetDag2tree2, findRoot, getMembers } from './DataBuilderUtil'
import { D3TreeNode } from './D3TreeNode'
import { NetworkView, NodeView } from '../../../../models/ViewModel'
import { CirclePackingView } from '../../model/CirclePackingView'
import { IdType } from '../../../../models/IdType'
import { translateMemberIds } from '../../../../utils/ndex-utils'

/**
 *
 * @param getToken
 * @param uuid
 * @param nodeIds
 * @returns
 */
export const getNames = async (
  url: string,
  getToken: () => Promise<string>,
  uuid: string,
  nodeIds: string[],
): Promise<string[]> => {
  const token: string = await getToken()

  // TODO: move this function to the core??
  const names: string[] = await translateMemberIds({
    networkUUID: uuid,
    ids: nodeIds,
    url,
    accessToken: token,
  })

  return names
}
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
  rootNetworkHostUrl,
  getToken,
  rootNetworkId,
}: {
  network: Network
  nodeTable: Table
  rootNetworkHostUrl: string
  getToken: () => Promise<string>
  rootNetworkId: IdType
}): Promise<HierarchyNode<D3TreeNode>> => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core
  const root = findRoot(cyNet)
  const treeElementList: any[] = []
  const visited3: { [key: string]: number } = {}

  const allMembers = new Set<string>()

  // Create ID to readable name map only when it is necessary
  const rootMembers: string[] | number[] = getMembers(root.id(), nodeTable)
  // test the first ID is a number or not
  const firstMember: string = rootMembers[0]
  const id2name: Map<string | number, string> = new Map<
    string | number,
    string
  >()
  if (Number.parseInt(firstMember)) {
    // Member list is a list of numbers
    try {
      const names = await getNames(
        rootNetworkHostUrl,
        getToken,
        rootNetworkId,
        rootMembers,
      )
      rootMembers.forEach((member: string) => {
        const memberId: number = Number.parseInt(member)
        const memberName: string = names[memberId]
        id2name.set(memberId, memberName)
      })
    } catch (e) {
      console.warn('Failed to convert to ID to node names', e)
    }
  }

  cyNetDag2tree2(
    root,
    null,
    cyNet,
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
      .sum((d: D3TreeNode) => 1)
      .sort((a, b) => {
        const valA = a.value as number
        const valB = b.value as number
        return valB - valA
      })
    return hierarchyRootNode
  } catch (e) {
    console.error('Failed to build D3 tree,', e)
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
