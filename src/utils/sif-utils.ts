import NetworkFn, { Network, Node, Edge } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { v4 as uuidv4 } from 'uuid'
import { Column } from '../models/TableModel/Column'
import { AttributeName } from '../models/TableModel/AttributeName'
import { ValueType } from '../models/TableModel/ValueType'

interface SifEdge extends Edge {
  interaction: string
  sourceName: string
  targetName: string
}

interface FullNetworkData {
  network: Network
  nodeTable: Table
  edgeTable: Table
  visualStyle: VisualStyle
  networkView: NetworkView
  visualStyleOptions: VisualStyleOptions
}

/**
 * Parse SIF text into nodes and edges (with interaction), using integer string IDs for nodes
 */
function parseSif(sifText: string): {
  nodeIdMap: Map<string, string>
  nodeNames: string[]
  edges: SifEdge[]
} {
  // Map node name -> integer string id
  const nodeIdMap = new Map<string, string>()
  const nodeNames: string[] = []
  const edges: SifEdge[] = []
  let edgeId = 0
  const lines = sifText.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue
    const sourceName = parts[0]
    if (!nodeIdMap.has(sourceName)) {
      nodeIdMap.set(sourceName, nodeNames.length.toString())
      nodeNames.push(sourceName)
    }
    const interaction = parts[1]
    for (let i = 2; i < parts.length; i++) {
      const targetName = parts[i]
      if (!nodeIdMap.has(targetName)) {
        nodeIdMap.set(targetName, nodeNames.length.toString())
        nodeNames.push(targetName)
      }
      edges.push({
        id: `e${edgeId++}`,
        s: nodeIdMap.get(sourceName)!,
        t: nodeIdMap.get(targetName)!,
        interaction,
        sourceName,
        targetName,
      })
    }
  }
  return { nodeIdMap, nodeNames, edges }
}

/**
 * Create a full network data object from SIF text
 * @param localNetworkId - The unique identifier for the local network
 * @param sifText - The SIF file contents as a string
 * @returns A full network data object including tables, styles, and aspects
 */
export const createDataFromLocalSif = async (
  localNetworkId: string,
  sifText: string,
): Promise<FullNetworkData> => {
  const { nodeIdMap, nodeNames, edges } = parseSif(sifText)
  // Create node list with integer string IDs
  const nodeList: Node[] = nodeNames.map((name, idx) => ({
    id: idx.toString(),
  }))
  const network: Network = NetworkFn.createNetworkFromLists(
    localNetworkId,
    nodeList,
    edges,
  )

  // Node table with 'name' column
  const nodeNameCol: Column = { name: 'name', type: 'string' }
  const nodeTable: Table = TableFn.createTable(`${localNetworkId}-nodes`, [
    nodeNameCol,
  ])
  nodeNames.forEach((name, idx) => {
    nodeTable.rows.set(idx.toString(), { name })
  })

  // Edge table with 'name' and 'interaction' columns
  const edgeNameCol: Column = { name: 'name', type: 'string' }
  const edgeInteractionCol: Column = { name: 'interaction', type: 'string' }
  const edgeTable: Table = TableFn.createTable(`${localNetworkId}-edges`, [
    edgeNameCol,
    edgeInteractionCol,
  ])
  edges.forEach((edge) => {
    const name = `${edge.sourceName} ${edge.interaction} ${edge.targetName}`
    edgeTable.rows.set(edge.id, {
      name,
      interaction: edge.interaction,
    })
  })

  const visualStyle: VisualStyle = VisualStyleFn.createVisualStyle()
  // Minimal default visual style options
  const visualStyleOptions: VisualStyleOptions = {
    visualEditorProperties: {
      nodeSizeLocked: false,
      arrowColorMatchesEdge: false,
      tableDisplayConfiguration: {
        nodeTable: {
          columnConfiguration: nodeTable.columns.map((col) => ({
            attributeName: col.name,
            visible: true,
          })),
        },
        edgeTable: {
          columnConfiguration: edgeTable.columns.map((col) => ({
            attributeName: col.name,
            visible: true,
          })),
        },
      },
    },
  }
  const networkView: NetworkView = ViewModelFn.createViewModel(network)
  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkView,
    visualStyleOptions,
  }
}
