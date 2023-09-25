import { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table, ValueType } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'

import * as d3Hierarchy from 'd3-hierarchy'
import { HierarchyNode } from 'd3-hierarchy'

let counter: Set<string> = new Set<string>()

const getMembers = (nodeId: IdType, table: Table): string[] => {
  if (nodeId === undefined) {
    throw new Error('Node id is undefined')
  }

  const row: Record<string, ValueType> | undefined = table.rows.get(nodeId)
  if (row === undefined) {
    throw new Error(`Row ${nodeId} not found`)
  }
  return row[SubsystemTag.members] as string[]
}

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

interface D3TreeNode {
  id: string
  parent: string
  members?: string[]
  children?: D3TreeNode[]
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
  const edgeCount: number = cyNet.edges().size()

  // Dag2tree

  // Add root node to the list
  const d3RootNode: D3TreeNode = {
    id: rootNodeId,
    parent: '',
  }

  // List representation of the tree
  const listTree: D3TreeNode[] = [d3RootNode]
  // Edge Ids
  const toBeRemoved: Set<EdgeSingular> = new Set()
  const treeList: D3TreeNode[] = []
  const visited: Set<string> = new Set()
  dag2tree(cyNet, root, toBeRemoved, treeList, visited)
  console.log('##The toBeRemoved', toBeRemoved.size)
  console.log('##TreeList', treeList)

  const testSet = new Set<string>()
  treeList.forEach((element) => {
    testSet.add(element.id)
    testSet.add(element.parent)
  })
  console.log('##TestSet SIZE', testSet.size)

  // Create input list for d3 stratify function
  counter = new Set<string>()
  counter.add(rootNodeId)
  traverseTree(root, nodeTable, edgeTable, listTree, toBeRemoved)

  // const edgeList = toTree(cyNet, toBeRemoved, nodeTable)
  console.log('##The Tree list', listTree, nodeCount, edgeCount)

  const hierarchyRoot: HierarchyNode<D3TreeNode> = d3Hierarchy
    .stratify<D3TreeNode>()
    .parentId((d) => d.parent)(listTree)

  console.log(
    '##The hierarchy',
    hierarchyRoot,
    hierarchyRoot.descendants().length,
    counter.size,
  )

  // Test hierarchy
  const nodeSet: Set<string> = new Set<string>()
  traverse(hierarchyRoot, nodeSet)
  console.log('##The node set', nodeSet.size)
  return hierarchyRoot
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
  treeList: D3TreeNode[],
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
    counter.add(child.id())

    // From parent to child
    const incomers = child.incomers()
    const incomingEdges = incomers.edges()
    if (incomingEdges.size() === 1) {
      // There is only one edge from parent. No need to do remove the edge
      treeList.push({
        id: child.id(),
        parent: parentId,
      })
      incomingEdges[0].data('treeEdge', true)
      dag2tree(cyNet, child, toBeRemoved, treeList, visited)
    } else {
      // There are multiple parents
      let targetChild: NodeSingular | undefined
      incomingEdges.forEach((edge) => {
        if (edge.source().id() !== parentId) {
          // toBeRemoved.add(edge)
          edge.data('treeEdge', false)
          // cyNet.remove(edge)
        } else {
          targetChild = edge.target()
          edge.data('treeEdge', true)
        }
      })

      if (targetChild !== undefined) {
        // treeList.push({
        //   id: targetChild.id(),
        //   parent: parentId,
        // })
        dag2tree(cyNet, targetChild, toBeRemoved, treeList, visited)
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
const traverseTree = (
  parent: NodeSingular,
  nodeTable: Table,
  edgeTable: Table,
  tree: D3TreeNode[],
  edgesToBeRemoved: Set<EdgeSingular>,
): void => {
  const outElements = parent.outgoers()
  const childEdges = outElements.edges()

  childEdges.forEach((edge: EdgeSingular) => {
    // const edgeId: string = edge.id()
    const childNode = edge.target()

    if (edge.data('treeEdge') as boolean) {
      counter.add(childNode.id())
      const members = getMembers(childNode.id(), nodeTable)
      const newNode: D3TreeNode = {
        id: childNode.id(),
        parent: parent.id(),
        members,
      }
      tree.push(newNode)
      // Recursively traverse the child's children
      traverseTree(childNode, nodeTable, edgeTable, tree, edgesToBeRemoved)
    }
  })
}
