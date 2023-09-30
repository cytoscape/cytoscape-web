import {
  Core,
  EdgeCollection,
  EdgeSingular,
  NodeCollection,
  NodeSingular,
} from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import { Table, ValueType } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'

/**
 * Get the member list of the given node
 *
 * @param nodeId
 * @param table
 * @returns
 */
export const getMembers = (nodeId: IdType, table: Table): string[] => {
  if (nodeId === undefined) {
    throw new Error('Node ID is undefined')
  }

  const row: Record<string, ValueType> | undefined = table.rows.get(nodeId)
  if (row === undefined) {
    throw new Error(`Row ${nodeId} not found`)
  }
  return row[SubsystemTag.members] as string[]
}

export const findRoot = (cyNet: Core): NodeSingular => {
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
 * Transform the given DAG to a tree
 *
 * @param nodeId The root node ID of the DAG
 * @param cyNet The DAG as a Cytoscape network
 * @param visited A map of visited nodes
 * @param treeElements The tree converted from the DAG
 *
 */
export const cyNetDag2tree = (
  nodeId: string,
  cyNet: Core,
  visited: Record<string, number>,
  treeElements: any[],
): void => {
  // Initialize visited count for node (initial value is 1. Add 1 for each visit)
  visited[nodeId] = visited[nodeId] === undefined ? 1 : visited[nodeId] + 1

  // Create a new node ID based on visited count (use the same ID for the first visit)
  const newNodeId =
    visited[nodeId] > 1 ? `${nodeId}-${visited[nodeId]}` : nodeId

  console.log('##Node2', nodeId, newNodeId, visited[nodeId])

  // If the node has been visited more than once, record the original node ID
  if (visited[nodeId] === 1) {
    treeElements.push({ data: { id: newNodeId } })
  } else {
    treeElements.push({ data: { id: newNodeId, originalId: nodeId } })
  }

  // Recur for all children of the current node in the DAG
  const connectingEdges: EdgeCollection = cyNet.edges(`[source = "${nodeId}"]`)

  // Child node IDs
  const children: string[] = connectingEdges.map((edge: EdgeSingular) =>
    edge.target().id(),
  )

  for (const child of children) {
    if (visited[nodeId] > 1) {
      treeElements.push({
        data: {
          id: `${newNodeId} -> ${child}`,
          source: newNodeId,
          target: child,
        },
      })
    } else {
      treeElements.push({
        data: {
          id: `${nodeId} -> ${child}`,
          source: nodeId,
          target: child,
        },
      })
    }
    cyNetDag2tree(child, cyNet, visited, treeElements)
  }
}

export const cyNetDag2tree2 = (
  node: NodeSingular,
  parentId: string | null,
  cyNet: Core,
  nodeTable: Table,
  visited: Record<string, number>,
  treeElements: any[],
): void => {
  // CUrrent node ID
  const nodeId = node.id()

  // Initialize visited count for node (initial value is 1. Add 1 for each visit)
  visited[nodeId] = visited[nodeId] === undefined ? 1 : visited[nodeId] + 1

  // Create a new node ID based on visited count (use the same ID for the first visit)
  const newNodeId =
    visited[nodeId] > 1 ? `${nodeId}-${visited[nodeId]}` : nodeId

  console.log('##Node3', nodeId, newNodeId, visited[nodeId])

  treeElements.push({
    id: newNodeId,
    originalId: visited[nodeId] > 1 ? nodeId : undefined,
    parentId: parent === null ? '' : parentId,
    name: nodeTable.rows.get(nodeId)?.name as string,
    value: getMembers(nodeId, nodeTable).length,
    members: getMembers(nodeId, nodeTable),
  })

  const children: NodeCollection = node.outgoers().nodes()

  children.forEach((child: NodeSingular) => {
    cyNetDag2tree2(child, newNodeId, cyNet, nodeTable, visited, treeElements)
  })
}
