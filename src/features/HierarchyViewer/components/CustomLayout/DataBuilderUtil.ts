import { Core, NodeCollection, NodeSingular } from 'cytoscape'
import { IdType } from '../../../../models/IdType'
import { Table, ValueType } from '../../../../models/TableModel'
import { SubsystemTag } from '../../model/HcxMetaTag'
import { D3TreeNode } from './D3TreeNode'

export const DuplicateNodeSeparator = '-'
/**
 * Get the member list of the given node
 *
 * - First, search members, then memberName
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

  if (row[SubsystemTag.members] === undefined) {
    const memberNames: string[] = row[SubsystemTag.memberNames] as string[]
    if (memberNames === undefined) {
      throw new Error(`Member list not found for ${nodeId}`)
    }
    return memberNames
  } else {
    return row[SubsystemTag.members] as string[]
  }
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
 * Function to convert a DAG to a tree for stratify
 *
 * @param node
 * @param parentId
 * @param cyNet
 * @param nodeTable
 * @param visited
 * @param treeElements
 * @param members
 */
export const cyNetDag2tree2 = (
  node: NodeSingular,
  parentId: string | null,
  cyNet: Core,
  nodeTable: Table,
  visited: Record<string, number>,
  treeElements: any[],
  members: Set<string>,
  rootMemberMap: Map<string | number, string>,
): void => {
  // CUrrent node ID
  const nodeId = node.id()

  // Initialize visited count for node (initial value is 1. Add 1 for each visit)
  visited[nodeId] = visited[nodeId] === undefined ? 1 : visited[nodeId] + 1

  // Create a new node ID based on visited count (use the same ID for the first visit)
  // The new ID is the original ID with a suffix '-1d', '-2d', ...
  const newNodeId =
    visited[nodeId] > 1
      ? `${nodeId}${DuplicateNodeSeparator}${visited[nodeId]}d`
      : nodeId

  const newNode: D3TreeNode = {
    id: newNodeId,
    originalId: visited[nodeId] > 1 ? nodeId : undefined,
    parentId: parentId === null ? '' : parentId,
    name: nodeTable.rows.get(nodeId)?.name as string,
    size: getMembers(nodeId, nodeTable).length,
    members: getMembers(nodeId, nodeTable),
  }
  treeElements.push(newNode)

  const children: NodeCollection = node.outgoers().nodes()

  if (children.size() === 0) {
    // Add all members to the new node as new leaf nodes
    getMembers(nodeId, nodeTable).forEach((member: string) => {
      if (members.has(member)) {
        // console.log('##Duplicate member', member)
      } else {
        members.add(member)
      }

      // Use the conversion map only for the generated leaf nodes
      const label = rootMemberMap.get(member) ?? member
      treeElements.push({
        id: `${newNodeId}-${member}`,
        originalId: member,
        parentId: newNodeId,
        name: label,
        size: 1,
        members: [],
      })
    })
  } else {
    // Add all members NOT in the children of this node
    const childMembers = new Set<string>()
    children.forEach((child: NodeSingular) => {
      const currentMembers = getMembers(child.id(), nodeTable)
      currentMembers.forEach((member: string) => {
        childMembers.add(member)
      })
    })
    const nodeMembers: Set<string> = new Set(getMembers(nodeId, nodeTable))
    // console.log(
    //   'Child members & node mem',
    //   Array.from(childMembers).sort(),
    //   Array.from(nodeMembers).sort(),
    // )

    nodeMembers.forEach((member: string) => {
      members.add(member)
      const label = rootMemberMap.get(member) ?? member

      if (!childMembers.has(member)) {
        treeElements.push({
          id: `${newNodeId}-${member}`,
          originalId: member,
          parentId: newNodeId,
          name: label,
          size: 1,
          members: [],
        })
      }
    })
  }

  children.forEach((child: NodeSingular) => {
    cyNetDag2tree2(
      child,
      newNodeId,
      cyNet,
      nodeTable,
      visited,
      treeElements,
      members,
      rootMemberMap,
    )
  })
}
