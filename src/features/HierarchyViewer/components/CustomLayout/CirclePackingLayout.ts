import { Core, NodeSingular, SingularElementReturnValue } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import NetworkFn, { Network } from '../../../../models/NetworkModel'
import { Table, ValueType } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'

import * as d3Hierarchy from 'd3-hierarchy'

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

/**
 * Return the branch of the network rooted at the given node
 *
 * @param network
 * @param nodeId
 * @returns Edge list of the children of the node
 */
export const createTreeLayout = (
  network: Network,
  nodeId: IdType,
  nodeTable: Table,
  edgeTable: Table,
): void => {
  // Get the internal data store. In this case, it is a cytoscape instance
  const cyNet: Core = NetworkFn.getInternalNetworkDataStore(network) as Core

  // const node = cyNet.getElementById(nodeId)

  const root = findRoot(cyNet)
  const rootNodeId: IdType = root.id()

  console.log('##The Root', root.data(), rootNodeId)

  // Add root node to the list
  const d3RootNode: D3TreeNode = { name: rootNodeId, parent: '' }
  const listTree: D3TreeNode[] = [d3RootNode]

  // Avoid duplicate nodes
  const nodeSet = new Set<string>()
  nodeSet.add(rootNodeId)

  // Create input list for d3 stratify function
  traverseTree(root, nodeTable, edgeTable, listTree, nodeSet)

  console.log('##The Tree', listTree)
  const hierarchyRoot = d3Hierarchy
    .stratify()
    .id(function (d: D3TreeNode) {
      return d.name
    })
    .parentId(function (d: D3TreeNode) {
      return d.parent
    })(listTree)
  console.log('##The hierarchy', hierarchyRoot)

  // const edges: Edge[] = []

  // let children = node.successors()
  // // Check these are children of the given node
  // const filtered = children.filter((element) => element.id() === rootNodeId)

  // // If there is no match, these are the children of the given node
  // if (filtered.size() !== 0) {
  //   children = node.predecessors()
  // }

  // children.forEach((element) => {
  //   if (element.isEdge()) {
  //     edges.push({
  //       id: element.id(),
  //       s: element.source().id(),
  //       t: element.target().id(),
  //     })
  //   }
  // })

  // // createHierarchy(edges, rootNodeId)

  // return edges
}

interface D3TreeNode {
  name: string
  parent: string
  members?: string[]
}

/**
 * Utility to convert
 * @param cyNode
 * @param table
 * @param tree
 */
const traverseTree = (
  cyNode: NodeSingular,
  nodeTable: Table,
  edgeTable: Table,
  tree: D3TreeNode[],
  nodeSet: Set<string>,
): void => {
  // This contains both nodes and edges
  const outElements = cyNode.outgoers()
  const cyNodeId = cyNode.id()
  if (!nodeSet.has(cyNodeId)) {
    nodeSet.add(cyNodeId)
  } else {
    // Already exists. Need to change name
  }

  outElements.forEach((ele: SingularElementReturnValue) => {
    if (ele.isNode()) {
      const currentCyNode = ele as NodeSingular
      const incomers = currentCyNode.incomers()
      if (incomers.size() === 2) {
        // This has only one parent
        console.log('IN more than one', incomers)
        // Do something with the child node
        const members = getMembers(ele.id(), nodeTable)
        const newNode: D3TreeNode = {
          name: ele.id(),
          parent: cyNode.id(),
          members,
        }
        tree.push(newNode)
        // console.log('C::', ele.id(), newNode, members)

        // Recursively traverse the child's children
        traverseTree(ele, nodeTable, edgeTable, tree, nodeSet)
      } else {
        // There are multiple parents
      }
    }
  })
}

// interface HNode {
//   id: string
//   children?: HNode[]
// }
// const createHierarchy = (edges: Edge[], rootNodeId: string): void => {
// const nodes: HNode[] = {}
// // Create a node object for each edge
// edges.forEach((edge) => {
//   nodes.add({ id: edge.id })
// })
// // Link the nodes together
// edges.forEach((edge) => {
//   const source: HNode = nodes[edge.s]
//   const target: HNode = nodes[edge.t]
//   if (source.children !== undefined) {
//     source.children = []
//   }
//   source.children?.push(target)
// })
// // Find the root node
// const rootNode = nodes[0]
// Create the D3 hierarchy object
// const hierarchy = d3Hierarchy.hierarchy(rootNode, (d) => d.children)
// console.log('H Created:', hierarchy)
// }
