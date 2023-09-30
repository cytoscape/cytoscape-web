import { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table, ValueType } from '../../../../models/TableModel'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'
import {
  cyNetDag2tree,
  cyNetDag2tree2,
  findRoot,
  getMembers,
} from './DataBuilderUtil'
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
    name: 'Root node',
    parentId: '',
    members: rootMembers,
    value: rootMembers.length,
  }

  // List representation of the tree
  const listTree: D3TreeNode[] = [d3RootNode]
  // Edge Ids
  const multipleParents: Set<EdgeSingular> = new Set()
  const visited: Set<string> = new Set()

  // Mark the duplicate edges and make it a tree
  dag2tree(cyNet, root, multipleParents, visited)

  // Record the leaf nodes for post processing
  const leafSet = new Set<NodeSingular>()

  // Create a list of edges with duplicates

  // parent -> child pair
  const duplicatedNodes = new Set<[NodeSingular, NodeSingular]>()
  createEdgeList(root, nodeTable, listTree, leafSet, false, duplicatedNodes)
  // duplicatedNodes.forEach((node: NodeSingular) => {
  //   createEdgeList(node, nodeTable, listTree, leafSet, true, duplicatedNodes)
  // })

  console.log('##Leaf', leafSet)
  // leafSet.forEach((leaf: NodeSingular) => {
  //   addMissingMembers(rootNodeId, leaf, nodeTable, listTree)
  // })

  console.log('##Multiple Parents', multipleParents)

  // Convert to D3 hierarchy
  const hierarchyRoot: HierarchyNode<D3TreeNode> =
    d3Hierarchy.stratify<D3TreeNode>()(listTree)

  hierarchyRoot.sum((d: D3TreeNode) => d.value)

  // Reconnect the tree
  const edgeMap: Map<string, Set<string>> = new Map()
  multipleParents.forEach((edge: EdgeSingular) => {
    const sourceId = edge.source().id()
    const targetId = edge.target().id()
    let edgeSet = edgeMap.get(sourceId)
    if (edgeSet === undefined) {
      edgeSet = new Set()
    }
    edgeSet.add(targetId)
    edgeMap.set(sourceId, edgeSet)
  })

  // reconnect(hierarchyRoot, edgeMap)

  const treeNodeCount: number = hierarchyRoot.descendants().length
  console.log('##The hierarchy', hierarchyRoot, treeNodeCount)

  if (nodeCount > treeNodeCount) {
    throw new Error('Node count mismatch. Some nodes are not in the tree!!')
  }

  // Test
  const visitedCy: { [key: string]: number } = {}
  // Initialize the tree elements
  const treeElements: any[] = []
  cyNetDag2tree(rootNodeId, cyNet, visitedCy, treeElements)

  console.log(treeElements)

  const treeElements2 = treeElements2D3Tree(rootNodeId, treeElements, nodeTable)
  console.log(treeElements2)

  const tree3: any[] = []
  const visited3: { [key: string]: number } = {}

  cyNetDag2tree2(root, null, cyNet, nodeTable, visited3, tree3)
  const hierarchyRoot3: HierarchyNode<D3TreeNode> =
    d3Hierarchy.stratify<D3TreeNode>()(tree3)

  hierarchyRoot3.sum((d: D3TreeNode) => d.value)
  console.log(hierarchyRoot3)

  // const hierarchyRoot2: HierarchyNode<D3TreeNode> =
  //   d3Hierarchy.stratify<D3TreeNode>()(treeElements2)

  // hierarchyRoot2.sum((d: D3TreeNode) => d.value)

  return hierarchyRoot3
}

const treeElements2D3Tree = (
  rootId: string,
  treeElements: any[],
  nodeTable: Table,
): D3TreeNode[] => {
  const idSet = new Set<string>()
  // Transform the tree elements to stratify input
  const treeList: D3TreeNode[] = []
  treeElements.forEach((element) => {
    if (element.data.id === rootId) {
      // This is the root node.
      idSet.add(element.data.id)
      const members = getMembers(element.data.id, nodeTable)
      treeList.push({
        id: element.data.id,
        name: (nodeTable.rows.get(rootId)?.name as string) ?? 'Root node',
        members,
        value: members.length,
        parentId: '',
      })
    } else if (element.data.source !== undefined) {
      // This is an edge
      const members = getMembers(element.data.target, nodeTable)
      idSet.add(element.data.target)
      treeList.push({
        id: element.data.target,
        name: nodeTable.rows.get(element.data.target)?.name as string,
        parentId: element.data.source,
        members,
        value: members.length,
      })
      // } else if (element.data.parent !== undefined) {
      //   // It's a node
      //   idSet.add(element.data.id)
      //   treeList.push({
      //     id: element.data.id,
      //     originalId: element.data.originalId,
      //     name: nodeTable.rows.get(element.data.originalId)?.name as string,
      //     members: getMembers(element.data.originalId, nodeTable),
      //     value: getMembers(element.data.originalId, nodeTable).length,
      //     parentId:
      //       element.data.parent !== undefined ? element.data.parent : null,
      //   })
    }
  })

  return treeList
}

// const findNodeById = (
//   node: HierarchyNode<D3TreeNode>,
//   id: string,
// ): HierarchyNode<D3TreeNode> | null => {
//   if (node.data.id === id) {
//     return node
//   }

//   const children = node.children
//   if (children !== undefined) {
//     for (const child of children) {
//       const foundNode = findNodeById(child, id)
//       if (foundNode !== null) {
//         return foundNode
//       }
//     }
//   }

//   return null
// }

// const reconnect = (
//   node: HierarchyNode<D3TreeNode>,
//   edgeMap: Map<string, Set<string>>,
// ): void => {
//   const children = node.children
//   if (children === undefined || children.length === 0) {
//     return
//   }

//   // const toBeAdded: Array<HierarchyNode<D3TreeNode>> = []
//   if (edgeMap.has(node.data.id)) {
//     const childIds = edgeMap.get(node.data.id)
//     console.log('##Multiple parents', childIds)

//     childIds?.forEach((childId) => {
//       const child = findNodeById(node, childId)
//       if (child !== null) {
//         console.log('##Found child', child)
//         // const newChild = _.cloneDeep(child)

//         // toBeAdded.push(newChild)
//       }
//     })
//   }

//   children.forEach((child) => {
//     reconnect(child, edgeMap)
//   })
//   // const newChildren = children.concat(toBeAdded)
//   // node.children = [...newChildren]
// }

// const addMissingMembers = (
//   rootNodeId: string,
//   currentNode: NodeSingular,
//   nodeTable: Table,
//   listTree: D3TreeNode[],
// ): void => {
//   // Case 1: Reached to the root node
//   if (currentNode.id() === rootNodeId) {
//     return
//   }

//   const incomers = currentNode.incomers()
//   // const inNodes = incomers.nodes()
//   const inEdges = incomers.edges()

//   let parent: NodeSingular
//   if (inEdges.size() !== 1) {
//     const treeEdges = inEdges.filter(
//       (edge: EdgeSingular) => edge.data('treeEdge') === true,
//     )

//     if (treeEdges.size() !== 1) {
//       throw new Error('There should be only one parent')
//     } else {
//       const parentEdge = treeEdges[0]
//       parent = parentEdge.source()
//     }
//   } else {
//     parent = inEdges[0].source()
//   }
//   // First, obtain the children.
//   const children = currentNode.outgoers().nodes()
//   // Still on leaf. Go to the parent
//   if (children.size() === 0) {
//     return addMissingMembers(rootNodeId, parent, nodeTable, listTree)
//   }

//   // const childIds = children.map((child) => child.id())
//   const members = getMembers(currentNode.id(), nodeTable)
//   const descendants = getAllChildren(currentNode, nodeTable)
//   const diff = _.difference(members, Array.from(descendants))

//   // console.log('Members and children', members.length, descendants.size)
//   // console.log('DIFF', diff)
//   diff.forEach((memberId: string) => {
//     const newNode: D3TreeNode = {
//       id: memberId,
//       name: nodeTable.rows.get(rootNodeId)?.name as string,
//       parentId: currentNode.id(),
//       members: [memberId],
//       value: 1,
//     }
//     listTree.push(newNode)
//   })
//   // const newNode: D3TreeNode = {
//   //   id: leaf.id(),
//   //   parentId: leaf.id(),
//   //   members,
//   //   value: members.length,
//   // }
//   // listTree.push(newNode)
// }
// const getAllChildren = (root: NodeSingular, nodeTable: Table): Set<string> => {
//   // const children: NodeSingular[] = []
//   const members = new Set<string>()
//   const visited: Set<string> = new Set()

//   const dfs = (node: NodeSingular): void => {
//     visited.add(node.id())
//     node
//       .outgoers()
//       .nodes()
//       .forEach((child: NodeSingular) => {
//         if (!visited.has(child.id())) {
//           const nodeId = child.id()
//           const childMembers = getMembers(nodeId, nodeTable)
//           childMembers.forEach((member) => {
//             members.add(member)
//           })
//           // children.push(child)
//           dfs(child)
//         }
//       })
//   }

//   dfs(root)

//   return members
// }

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
  tree: D3TreeNode[],
  leafSet: Set<NodeSingular>,
  duplicateBranch: boolean,
  duplicatedNodes: Set<[NodeSingular, NodeSingular]>,
): void => {
  const currentNodeId: string = currentNode.id()

  const outElements = currentNode.outgoers()
  const childEdges = outElements.edges()
  if (childEdges.size() === 0) {
    // No edges. This is a leaf node
    leafSet.add(currentNode)
    // const members = getMembers(currentNodeId, nodeTable)
    // members.forEach((member: string) => {
    //   const newId = duplicateBranch ? `${member}-${Math.random()}` : member
    //   const newNode: D3TreeNode = {
    //     id: newId,
    //     // id: member,
    //     name: nodeTable.rows.get(member)?.name as string,
    //     parentId: currentNodeId,
    //     members: [newId],
    //     value: 1,
    //     isDuplicate: duplicateBranch,
    //   }
    //   tree.push(newNode)
    // })
    return
  }

  childEdges.forEach((edge: EdgeSingular) => {
    const childNode = edge.target()
    const parentNode = edge.source()

    if (edge.data('treeEdge') as boolean) {
      const newId = duplicateBranch
        ? `${childNode.id()}-${parentNode.id()}`
        : childNode.id()
      const members = getMembers(childNode.id(), nodeTable)
      const newNode: D3TreeNode = {
        // id: childNode.id(),
        id: newId,
        originalId: duplicateBranch ? childNode.id() : undefined,
        name: nodeTable.rows.get(childNode.id())?.name as string,
        parentId: currentNodeId,
        members,
        value: members.length,
      }
      tree.push(newNode)
      // Recursively traverse the child's children
      createEdgeList(
        childNode,
        nodeTable,
        tree,
        leafSet,
        duplicateBranch,
        duplicatedNodes,
      )
    } else {
      // Duplicate branch found.
      // Add the branch's root node
      const newDuplicatedNode: D3TreeNode = getBranchRoot(
        parentNode,
        childNode,
        nodeTable,
      )
      tree.push(newDuplicatedNode)
      // // Record the duplicated node
      duplicatedNodes.add([parentNode, childNode])
      const grandChildren = childNode.outgoers().nodes()
      if (grandChildren.size() === 0) {
        // This is a leaf node
      } else {
        // Recursively traverse the children
        grandChildren.forEach((grandChild: NodeSingular) => {
          // Add duplicate route
          addDuplicateBranch(grandChild, newDuplicatedNode.id, nodeTable, tree)
        })
      }
    }
  })
}

const getBranchRoot = (
  parentNode: NodeSingular,
  childNode: NodeSingular,
  nodeTable: Table,
): D3TreeNode => {
  // Node ID used in the original DAG
  const originalNodeId: string = childNode.id()
  const parentNodeId: string = parentNode.id()
  // Members in the original node
  const members: string[] = getMembers(originalNodeId, nodeTable)
  // Name of the node
  const row: Record<string, ValueType> | undefined =
    nodeTable.rows.get(originalNodeId)
  if (row === undefined) {
    throw new Error(`Row ${originalNodeId} not found`)
  }
  // Modified ID for the duplicate node
  const newId = `${originalNodeId}-${parentNodeId}`
  // Name of the node
  const name: string = (row.name ?? newId) as string
  const newName: string = `${name} (duplicated)`
  return {
    id: newId,
    originalId: originalNodeId,
    name: newName,
    parentId: parentNodeId,
    members,
    value: members.length,
  }
}

const addDuplicateBranch = (
  node: NodeSingular,
  parentNodeId: string,
  nodeTable: Table,
  tree: D3TreeNode[],
): void => {
  // Node ID used in the original DAG
  const originalNodeId: string = node.id()

  // Members in the original node
  const members: string[] = getMembers(originalNodeId, nodeTable)

  // Name of the node
  const row: Record<string, ValueType> | undefined =
    nodeTable.rows.get(originalNodeId)

  if (row === undefined) {
    throw new Error(`Row ${originalNodeId} not found`)
  }

  // Modified ID for the duplicate node
  const newId = `${originalNodeId}-${Math.random()}`

  // Name of the node
  const name: string = (row.name ?? newId) as string
  const newName: string = `${name} (duplicated)`
  const newNode: D3TreeNode = {
    id: newId,
    originalId: originalNodeId,
    name: newName,
    parentId: parentNodeId,
    members,
    value: members.length,
  }
  tree.push(newNode)

  // Get the children of the node
  const childEdges = node.outgoers().edges()
  if (childEdges.size() === 0) {
    // This is a leaf node
  }

  // childEdges.forEach((edge: EdgeSingular) => {
  //   const childNode = edge.target()
  //   addDuplicateBranch(childNode, newId, nodeTable, tree)
  // })
}

// const transformDagToTree = (
//   node: string,
//   cyNet: Core,
//   visited: Record<string, number>,
//   treeElements: any[],
// ): void => {
//   // Initialize visited count for node
//   visited[node] = visited[node] === undefined ? 1 : visited[node] + 1

//   // Create a new node identifier based on visited count
//   const newNode = visited[node] > 1 ? `${node}_${visited[node]}` : node

//   console.log('##Node', node, newNode, visited[node])
//   // If there's a parent, add the new node to the parent's list of children
//   if (visited[node] === 1) {
//     treeElements.push({ data: { id: newNode } })
//   } else {
//     treeElements.push({ data: { id: newNode, parent: node } })
//   }

//   // Recur for all children of the current node in the DAG
//   const children = cyNet
//     .edges(`[source = "${node}"]`)
//     .map((edge: any) => edge.target().id())
//   for (const child of children) {
//     if (visited[node] > 1) {
//       treeElements.push({
//         data: {
//           id: `${newNode} -> ${child as string}`,
//           source: newNode,
//           target: child,
//         },
//       })
//     } else {
//       treeElements.push({
//         data: {
//           id: `${node} -> ${child as string}`,
//           source: node,
//           target: child,
//         },
//       })
//     }
//     transformDagToTree(child, cyNet, visited, treeElements)
//   }
// }
