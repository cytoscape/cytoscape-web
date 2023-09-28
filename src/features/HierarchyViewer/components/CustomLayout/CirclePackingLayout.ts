import { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import { getMembers } from './DataBuilderUtil'
import _ from 'lodash'

const findRoot = (cyNet: Core): NodeSingular => {
  // Get the selected node

  // Find root
  const roots = cyNet.nodes().roots()
  if (roots.size() !== 1) {
    throw new Error(
      'This is not a tree / DAG. There should be only one root node',
    )
  }
  return roots[0]
}

export interface D3TreeNode {
  id: string
  parentId: string
  value: number
  members: string[]
  children?: D3TreeNode[]
  isDuplicate?: boolean
}

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
  edgeTable: Table,
): HierarchyNode<D3TreeNode> => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core

  // const node = cyNet.getElementById(nodeId)

  const root = findRoot(cyNet)
  const rootNodeId: IdType = root.id()

  // original count
  const nodeCount: number = cyNet.nodes().size()

  // Dag2tree

  // Add root node to the list
  const rootMembers = getMembers(rootNodeId, nodeTable)
  const d3RootNode: D3TreeNode = {
    id: rootNodeId,
    parentId: '',
    members: rootMembers,
    value: rootMembers.length,
  }

  // List representation of the tree
  const listTree: D3TreeNode[] = [d3RootNode]
  // Edge Ids
  const toBeRemoved: Set<EdgeSingular> = new Set()
  const visited: Set<string> = new Set()
  dag2tree(cyNet, root, toBeRemoved, visited)

  // Record the leaf nodes for post processing
  const leafSet = new Set<NodeSingular>()
  createEdgeList(root, nodeTable, edgeTable, listTree, toBeRemoved, leafSet)

  console.log('##Leaf', leafSet)
  leafSet.forEach((leaf: NodeSingular) => {
    addMissingMembers(rootNodeId, leaf, nodeTable, listTree)
  })

  console.log('##Removed', toBeRemoved)

  const hierarchyRoot: HierarchyNode<D3TreeNode> =
    d3Hierarchy.stratify<D3TreeNode>()(listTree)

  hierarchyRoot.sum((d: D3TreeNode) => d.value)

  // Reconnect the tree
  const edgeMap: Map<string, Set<string>> = new Map()
  toBeRemoved.forEach((edge: EdgeSingular) => {
    const sourceId = edge.source().id()
    const targetId = edge.target().id()
    let edgeSet = edgeMap.get(sourceId)
    if (edgeSet === undefined) {
      edgeSet = new Set()
    }
    edgeSet.add(targetId)
    edgeMap.set(sourceId, edgeSet)
  })

  reconnect(hierarchyRoot, edgeMap)

  const treeNodeCount: number = hierarchyRoot.descendants().length
  console.log('##The hierarchy', hierarchyRoot, treeNodeCount)

  if (nodeCount > treeNodeCount) {
    throw new Error('Node count mismatch. Some nodes are not in the tree!!')
  }

  // Test hierarchy
  const nodeSet: Set<string> = new Set<string>()
  traverse(hierarchyRoot, nodeSet)

  // Now add members to the tree
  // const leaves: Array<HierarchyNode<D3TreeNode>> = hierarchyRoot.leaves()
  // const visitedNodes: Set<string> = new Set()
  // leaves.forEach((leaf) => {
  //   addMembersToTreeNode(leaf, visitedNodes)
  // })
  return hierarchyRoot
}

const findNodeById = (
  node: HierarchyNode<D3TreeNode>,
  id: string,
): HierarchyNode<D3TreeNode> | null => {
  if (node.data.id === id) {
    return node
  }

  const children = node.children
  if (children !== undefined) {
    for (const child of children) {
      const foundNode = findNodeById(child, id)
      if (foundNode !== null) {
        return foundNode
      }
    }
  }

  return null
}

const reconnect = (
  node: HierarchyNode<D3TreeNode>,
  edgeMap: Map<string, Set<string>>,
): void => {
  const children = node.children
  if (children === undefined || children.length === 0) {
    return
  }

  // const toBeAdded: Array<HierarchyNode<D3TreeNode>> = []
  if (edgeMap.has(node.data.id)) {
    const childIds = edgeMap.get(node.data.id)
    console.log('##Multiple parents', childIds)

    childIds?.forEach((childId) => {
      const child = findNodeById(node, childId)
      if (child !== null) {
        console.log('##Found child', child)
        // const newChild = _.cloneDeep(child)

        // toBeAdded.push(newChild)
      }
    })
  }

  children.forEach((child) => {
    reconnect(child, edgeMap)
  })
  // const newChildren = children.concat(toBeAdded)
  // node.children = [...newChildren]
}

const addMissingMembers = (
  rootNodeId: string,
  currentNode: NodeSingular,
  nodeTable: Table,
  listTree: D3TreeNode[],
): void => {
  // Case 1: Reached to the root node
  if (currentNode.id() === rootNodeId) {
    return
  }

  const incomers = currentNode.incomers()
  // const inNodes = incomers.nodes()
  const inEdges = incomers.edges()

  let parent: NodeSingular
  if (inEdges.size() !== 1) {
    const treeEdges = inEdges.filter(
      (edge: EdgeSingular) => edge.data('treeEdge') === true,
    )

    if (treeEdges.size() !== 1) {
      throw new Error('There should be only one parent')
    } else {
      const parentEdge = treeEdges[0]
      parent = parentEdge.source()
    }
  } else {
    parent = inEdges[0].source()
  }
  // First, obtain the children.
  const children = currentNode.outgoers().nodes()
  // Still on leaf. Go to the parent
  if (children.size() === 0) {
    return addMissingMembers(rootNodeId, parent, nodeTable, listTree)
  }

  // const childIds = children.map((child) => child.id())
  const members = getMembers(currentNode.id(), nodeTable)
  const descendants = getAllChildren(currentNode, nodeTable)
  const diff = _.difference(members, Array.from(descendants))

  console.log('Members and children', members.length, descendants.size)
  console.log('DIFF', diff)
  diff.forEach((memberId: string) => {
    const newNode: D3TreeNode = {
      id: memberId,
      parentId: currentNode.id(),
      members: [memberId],
      value: 1,
    }
    listTree.push(newNode)
  })
  // const newNode: D3TreeNode = {
  //   id: leaf.id(),
  //   parentId: leaf.id(),
  //   members,
  //   value: members.length,
  // }
  // listTree.push(newNode)
}
const getAllChildren = (root: NodeSingular, nodeTable: Table): Set<string> => {
  // const children: NodeSingular[] = []
  const members = new Set<string>()
  const visited: Set<string> = new Set()

  const dfs = (node: NodeSingular): void => {
    visited.add(node.id())
    node
      .outgoers()
      .nodes()
      .forEach((child: NodeSingular) => {
        if (!visited.has(child.id())) {
          const nodeId = child.id()
          const childMembers = getMembers(nodeId, nodeTable)
          childMembers.forEach((member) => {
            members.add(member)
          })
          // children.push(child)
          dfs(child)
        }
      })
  }

  dfs(root)

  return members
}

const traverse = (
  root: HierarchyNode<D3TreeNode>,
  nodeSet: Set<string>,
): void => {
  nodeSet.add(root.data.id)
  const children = root.children
  if (children !== undefined) {
    children.forEach((child) => {
      traverse(child, nodeSet)
    })
  }
}

/**
 *
 * @param parent
 * @param toBeRemoved
 */
const dag2tree = (
  cyNet: Core,
  parent: NodeSingular,
  toBeRemoved: Set<EdgeSingular>,
  visited: Set<string>,
): void => {
  const parentId: string = parent.id()
  if (visited.has(parentId)) {
    return
  }
  visited.add(parentId)
  // From the parent TO the children
  const children = parent.outgoers()

  // Child nodes
  const childNodes = children.nodes()

  childNodes.forEach((child) => {
    // From parent to child
    const incomers = child.incomers()
    const incomingEdges = incomers.edges()
    if (incomingEdges.size() === 1) {
      // There is only one edge from parent. No need to do remove the edge
      incomingEdges[0].data('treeEdge', true)
      dag2tree(cyNet, child, toBeRemoved, visited)
    } else {
      // There are multiple parents
      let targetChild: NodeSingular | undefined
      incomingEdges.forEach((edge) => {
        if (edge.source().id() !== parentId) {
          toBeRemoved.add(edge)
          edge.data('treeEdge', false)
        } else {
          targetChild = edge.target()
          edge.data('treeEdge', true)
        }
      })

      if (targetChild !== undefined) {
        dag2tree(cyNet, targetChild, toBeRemoved, visited)
      } else {
        throw new Error('Target child is null')
      }
    }
  })
}

/**
 * Utility to convert list of edges to a tree
 *
 * @param cyNode
 * @param table
 * @param tree
 */
const createEdgeList = (
  currentNode: NodeSingular,
  nodeTable: Table,
  edgeTable: Table,
  tree: D3TreeNode[],
  edgesToBeRemoved: Set<EdgeSingular>,
  leafSet: Set<NodeSingular>,
): void => {
  const currentNodeId: string = currentNode.id()
  const outElements = currentNode.outgoers()
  const childEdges = outElements.edges()
  if (childEdges.size() === 0) {
    // No edges. This is a leaf node
    leafSet.add(currentNode)
    const members = getMembers(currentNodeId, nodeTable)
    members.forEach((member: string) => {
      const newNode: D3TreeNode = {
        id: member,
        parentId: currentNodeId,
        members: [member],
        value: 1,
      }
      tree.push(newNode)
    })
    return
  }

  childEdges.forEach((edge: EdgeSingular) => {
    const childNode = edge.target()

    if (edge.data('treeEdge') as boolean) {
      const members = getMembers(childNode.id(), nodeTable)
      const newNode: D3TreeNode = {
        id: childNode.id(),
        parentId: currentNodeId,
        members,
        value: members.length,
      }
      tree.push(newNode)
      // Recursively traverse the child's children
      createEdgeList(
        childNode,
        nodeTable,
        edgeTable,
        tree,
        edgesToBeRemoved,
        leafSet,
      )
    } else {
      // Add extra route
      const members = getMembers(childNode.id(), nodeTable)
      const newNode: D3TreeNode = {
        id: `${childNode.id()}-${Math.random()}`,
        parentId: currentNodeId,
        members: [],
        isDuplicate: true,
        value: members.length,
      }
      tree.push(newNode)
      // Recursively traverse the child's children
      // createEdgeList(
      //   childNode,
      //   nodeTable,
      //   edgeTable,
      //   tree,
      //   edgesToBeRemoved,
      //   leafSet,
      // )
    }
  })
}
