import NetworkFn, { Network, Node, Edge } from '../models/NetworkModel'
import TableFn, { Table } from '../models/TableModel'
import ViewModelFn, { NetworkView } from '../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { NetworkWithView } from '../models/NetworkWithViewModel'
import { v4 as uuidv4 } from 'uuid'
import { Column } from '../models/TableModel/Column'
import { AttributeName } from '../models/TableModel/AttributeName'
import { ValueType } from '../models/TableModel/ValueType'

interface SifEdge extends Edge {
  interaction: string
  sourceName: string
  targetName: string
}

/**
 * Parse SIF text into nodes and edges (with interaction), using integer string IDs for nodes
 */
export function parseSif(sifText: string): {
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
    if (parts.length === 1) {
      // Orphan node (single node, no relationships)
      const nodeName = parts[0]
      if (!nodeIdMap.has(nodeName)) {
        nodeIdMap.set(nodeName, nodeNames.length.toString())
        nodeNames.push(nodeName)
      }
      continue
    }
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
 * @returns NetworkWithView object including tables, styles, and aspects
 */
export const createDataFromLocalSif = async (
  localNetworkId: string,
  sifText: string,
): Promise<NetworkWithView> => {
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

  const undoRedoStack = {
    undoStack: [],
    redoStack: [],
  }

  return {
    network,
    nodeTable,
    edgeTable,
    visualStyle,
    networkViews: [networkView],
    visualStyleOptions,
    undoRedoStack,
  }
}

// SIF Validation Types
export interface SifValidationIssue {
  code: string
  message: string
  severity: 'error' | 'warning'
  line?: number
  path?: string[]
}

export interface SifValidationResult {
  isValid: boolean
  errors: SifValidationIssue[]
  warnings: SifValidationIssue[]
}

/**
 * Validate SIF file contents according to the Cytoscape SIF spec.
 * Returns a list of errors and warnings, does not throw.
 */
export function validateSif(sifText: string): SifValidationResult {
  const errors: SifValidationIssue[] = []
  const warnings: SifValidationIssue[] = []
  const lines = sifText.split(/\r?\n/)
  const hasTab = lines.some((line) => line.includes('\t'))
  const nodeSet = new Set<string>()
  const edgeSet = new Set<string>() // key: source|type|target
  const nodeNameToLine: Record<string, number> = {}

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const rawLine = lines[i]
    const trimmed = rawLine.trim()
    if (!trimmed) continue
    // Split on exact delimiter to preserve empty fields
    let parts: string[]
    if (hasTab) {
      parts = rawLine.split('\t').map((f) => f.trim())
    } else {
      parts = rawLine.split(' ').map((f) => f.trim())
    }
    // Check for empty fields (for both delimiters) BEFORE removing leading/trailing empty fields
    for (let j = 0; j < parts.length; j++) {
      if (parts[j] == null || parts[j] === '') {
        if (parts.length === 1) {
          errors.push({
            code: 'EMPTY_NODE_NAME',
            message: `Line ${lineNum}: Node name is empty`,
            severity: 'error',
            line: lineNum,
          })
        } else if (j === 0) {
          errors.push({
            code: 'EMPTY_SOURCE_NODE',
            message: `Line ${lineNum}: Source node name is empty`,
            severity: 'error',
            line: lineNum,
          })
        } else if (j === 1) {
          errors.push({
            code: 'EMPTY_EDGE_TYPE',
            message: `Line ${lineNum}: Edge type is empty`,
            severity: 'error',
            line: lineNum,
          })
        } else {
          errors.push({
            code: 'EMPTY_TARGET_NODE',
            message: `Line ${lineNum}: Target node name is empty`,
            severity: 'error',
            line: lineNum,
          })
        }
      }
    }
    // Now remove leading/trailing empty fields (from leading/trailing delimiters)
    while (parts.length > 0 && parts[0] === '') parts.shift()
    while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
    if (parts.length === 0) continue

    // Single node (no relationships)
    if (parts.length === 1) {
      const nodeName = parts[0]
      if (!nodeName || nodeName === '') {
        // Already handled above
        continue
      }
      if (nodeSet.has(nodeName)) {
        warnings.push({
          code: 'DUPLICATE_NODE',
          message: `Line ${lineNum}: Duplicate node '${nodeName}' (first seen at line ${nodeNameToLine[nodeName]})`,
          severity: 'warning',
          line: lineNum,
        })
      } else {
        nodeSet.add(nodeName)
        nodeNameToLine[nodeName] = lineNum
      }
      continue
    }

    // Relationship line: must have at least 3 tokens
    if (parts.length < 3) {
      errors.push({
        code: 'INVALID_LINE_FORMAT',
        message: `Line ${lineNum}: Line must have either 1 or at least 3 tokens (found ${parts.length})`,
        severity: 'error',
        line: lineNum,
      })
      continue
    }
    const source = parts[0]
    const type = parts[1]
    const targets = parts.slice(2)

    // Validate source node
    if (!source || source === '') {
      // Already handled above
    } else {
      if (!nodeSet.has(source)) {
        nodeSet.add(source)
        nodeNameToLine[source] = lineNum
      }
    }
    // Validate edge type
    if (!type || type === '') {
      // Already handled above
    }
    // Validate targets
    for (const target of targets) {
      if (!target || target === '') {
        // Already handled above
        continue
      }
      if (!nodeSet.has(target)) {
        nodeSet.add(target)
        nodeNameToLine[target] = lineNum
      }
      // Edge uniqueness: source|type|target
      const edgeKey = `${source}|${type}|${target}`
      if (edgeSet.has(edgeKey)) {
        warnings.push({
          code: 'DUPLICATE_EDGE',
          message: `Line ${lineNum}: Duplicate edge '${source} ${type} ${target}'`,
          severity: 'warning',
          line: lineNum,
        })
      } else {
        edgeSet.add(edgeKey)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
