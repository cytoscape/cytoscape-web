#!/usr/bin/env ts-node
/**
 * Script to generate a Mermaid diagram of application state structure
 *
 * This script analyzes the exported application state JSON and creates
 * a visual diagram showing the state structure with TypeScript types
 * instead of JSON blobs.
 *
 * Usage:
 *   npx ts-node scripts/generate-state-diagram/generate-state-diagram.ts <state-json-file>
 */

import * as fs from 'fs'
import * as path from 'path'

interface StateNode {
  name: string
  type: string
  children: StateNode[]
  isArray: boolean
  isRecord: boolean
  keyType?: string
}

interface StateGraph {
  root: StateNode
  edges: Array<{ from: string; to: string; label?: string }>
}

// Type mappings for common structures
const TYPE_MAPPINGS: Record<string, string> = {
  workspace: 'Workspace',
  networks: 'Map<IdType, Network>',
  summaries: 'Record<IdType, NetworkSummary>',
  tables: 'Record<IdType, {nodeTable: Table, edgeTable: Table}>',
  visualStyles: 'Record<IdType, VisualStyle>',
  viewModels: 'Record<IdType, NetworkView[]>',
  visualStyleOptions: 'Record<IdType, VisualStyleOptions>',
  opaqueAspects: 'Record<IdType, OpaqueAspects>',
  undoRedoStacks: 'Record<IdType, UndoRedoStack>',
  apps: 'CyApp[]',
  serviceApps: 'ServiceApp[]',
  filterConfigs: 'FilterConfig[]',
  search: 'SearchState',
  layoutEngines: 'Record<string, LayoutEngine>',
  renderers: 'Record<string, Renderer>',
  rendererFunctions: 'Record<string, RendererFunction>',
  rendererFunctionsByNetworkId: 'Record<IdType, RendererFunction>',
  viewports: 'Record<string, Viewport>',
  messages: 'Message[]',
  client: 'KeycloakClient',
  ui: 'Ui',
  panels: 'Record<Panel, PanelState>',
  tableUi: 'TableUIState',
  networkBrowserPanelUi: 'NetworkBrowserPanelUIState',
  networkViewUi: 'NetworkViewUIState',
  nodeTable: 'Table',
  edgeTable: 'Table',
  nodeViews: 'Record<IdType, NodeView>',
  edgeViews: 'Record<IdType, EdgeView>',
  selectedNodes: 'IdType[]',
  selectedEdges: 'IdType[]',
}

// Store structure mappings
const STORE_STRUCTURE: Record<string, { container: string; type: string }> = {
  workspace: { container: 'workspace', type: 'Workspace' },
  network: { container: 'networks', type: 'Map<IdType, Network>' },
  networkSummary: {
    container: 'summaries',
    type: 'Record<IdType, NetworkSummary>',
  },
  table: {
    container: 'tables',
    type: 'Record<IdType, {nodeTable: Table, edgeTable: Table}>',
  },
  visualStyle: {
    container: 'visualStyles',
    type: 'Record<IdType, VisualStyle>',
  },
  viewModel: { container: 'viewModels', type: 'Record<IdType, NetworkView[]>' },
  uiState: { container: 'ui', type: 'Ui' },
  app: { container: 'apps', type: 'CyApp[]' },
  filter: { container: 'filterConfigs', type: 'FilterConfig[]' },
  layout: { container: 'layoutEngines', type: 'Record<string, LayoutEngine>' },
  renderer: { container: 'renderers', type: 'Record<string, Renderer>' },
  rendererFunction: {
    container: 'rendererFunctions',
    type: 'Record<string, RendererFunction>',
  },
  opaqueAspect: {
    container: 'opaqueAspects',
    type: 'Record<IdType, OpaqueAspects>',
  },
  undo: { container: 'undoRedoStacks', type: 'Record<IdType, UndoRedoStack>' },
  message: { container: 'messages', type: 'Message[]' },
  credential: { container: 'client', type: 'KeycloakClient' },
}

/**
 * Infer type from value structure
 */
function inferType(key: string, value: any, context: string[]): string {
  // Check explicit mappings first
  if (TYPE_MAPPINGS[key]) {
    return TYPE_MAPPINGS[key]
  }

  // Check store structure mappings
  if (context.length > 0) {
    const storeName = context[0]
    if (
      STORE_STRUCTURE[storeName] &&
      key === STORE_STRUCTURE[storeName].container
    ) {
      return STORE_STRUCTURE[storeName].type
    }
  }

  // Infer from structure
  if (value === null || value === undefined) {
    return 'unknown'
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object') {
      return `${key}[]` // Generic array type
    }
    return `${typeof value[0]}[]`
  }

  if (typeof value === 'object') {
    // Check if it's a Record/Map pattern (object with string keys)
    const keys = Object.keys(value)
    if (keys.length > 0) {
      // Check if keys look like IDs (UUIDs, numbers, etc.)
      const firstKey = keys[0]
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstKey,
        ) ||
        /^\d+$/.test(firstKey)
      ) {
        return `Record<IdType, ${key}>`
      }
      // Check if it's a simple object with known structure
      if (key.includes('Table') && 'columns' in value) {
        return 'Table'
      }
      if (
        key.includes('View') &&
        ('nodeViews' in value || 'edgeViews' in value)
      ) {
        return 'NetworkView'
      }
      if (
        key.includes('Style') &&
        ('nodeShape' in value || 'edgeLineStyle' in value)
      ) {
        return 'VisualStyle'
      }
      return key.charAt(0).toUpperCase() + key.slice(1) // Capitalize as type name
    }
    return 'object'
  }

  return typeof value
}

/**
 * Analyze JSON structure and build a graph
 */
function analyzeState(
  jsonData: any,
  context: string[] = [],
  maxDepth: number = 5,
): StateNode {
  const currentDepth = context.length
  const node: StateNode = {
    name: context[context.length - 1] || 'ApplicationState',
    type: currentDepth === 0 ? 'ApplicationState' : 'object',
    children: [],
    isArray: false,
    isRecord: false,
  }

  // Limit recursion depth
  if (currentDepth >= maxDepth) {
    node.type = inferType(node.name, jsonData, context)
    return node
  }

  if (Array.isArray(jsonData)) {
    node.isArray = true
    if (jsonData.length > 0) {
      const firstItem = jsonData[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        const itemType = inferType(node.name, firstItem, context)
        node.type = `${itemType}[]`
        // Analyze first item as representative (but only if not too deep)
        if (currentDepth < maxDepth - 1) {
          const itemNode = analyzeState(
            firstItem,
            [...context, `${node.name}[0]`],
            maxDepth,
          )
          node.children.push(itemNode)
        }
      } else {
        node.type = `${typeof firstItem}[]`
      }
    } else {
      node.type = 'unknown[]'
    }
    return node
  }

  if (jsonData === null || jsonData === undefined) {
    node.type = 'null | undefined'
    return node
  }

  if (typeof jsonData !== 'object') {
    node.type = typeof jsonData
    return node
  }

  // Check if it's a Record/Map pattern (object with ID-like keys)
  const keys = Object.keys(jsonData)
  if (keys.length > 0) {
    const firstKey = keys[0]
    // Check if keys look like IDs (UUIDs, numbers, etc.)
    const isRecord =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstKey,
      ) ||
      /^\d+$/.test(firstKey) ||
      (firstKey.length > 20 && !firstKey.includes(' '))

    if (isRecord && keys.length > 1) {
      node.isRecord = true
      node.keyType = 'IdType'
      // Analyze first value as representative
      const firstValue = jsonData[firstKey]
      if (typeof firstValue === 'object' && firstValue !== null) {
        const valueType = inferType(node.name, firstValue, context)
        node.type = `Record<IdType, ${valueType}>`
        // Analyze representative value structure
        if (currentDepth < maxDepth - 1) {
          const valueNode = analyzeState(
            firstValue,
            [...context, `${node.name}[${firstKey}]`],
            maxDepth,
          )
          node.children.push(valueNode)
        }
      } else {
        node.type = `Record<IdType, ${typeof firstValue}>`
      }
      return node
    }
  }

  // Regular object - analyze properties
  for (const [key, value] of Object.entries(jsonData)) {
    // Skip circular references and non-serializable values
    if (
      typeof value === 'string' &&
      (value === '[Circular Reference]' ||
        value.startsWith('[Function:') ||
        value.startsWith('[DOM ') ||
        value.startsWith('[Non-serializable') ||
        value.startsWith('[Serialization Error]'))
    ) {
      continue
    }

    // Skip deeply nested Cytoscape.js internal structures
    if (
      key === '_private' ||
      key === '_store' ||
      key === 'emitter' ||
      key === 'listeners'
    ) {
      continue
    }

    // Skip visual style property fields (nodeShape, nodeBorderColor, etc.)
    // These are too numerous and not useful for high-level understanding
    if (context.length > 0) {
      const parentName = context[context.length - 1]
      if (
        parentName === 'visualStyles' ||
        (parentName &&
          parentName.includes('visualStyle') &&
          (key.startsWith('node') || key.startsWith('edge')))
      ) {
        // Skip individual visual property fields
        continue
      }
    }

    const childType = inferType(key, value, context)

    // Skip primitive types - we only care about interfaces/types
    if (
      typeof value !== 'object' ||
      value === null ||
      (typeof value === 'object' &&
        !Array.isArray(value) &&
        (childType === 'string' ||
          childType === 'number' ||
          childType === 'boolean' ||
          childType === 'null' ||
          childType === 'undefined' ||
          childType === 'null | undefined'))
    ) {
      continue
    }
    const childNode: StateNode = {
      name: key,
      type: childType,
      children: [],
      isArray: Array.isArray(value),
      isRecord: false,
    }

    // Recursively analyze children (but limit detail for large objects)
    if (
      typeof value === 'object' &&
      value !== null &&
      currentDepth < maxDepth - 1
    ) {
      // Skip deep analysis for very large objects (like Cytoscape.js internals)
      const keys = Object.keys(value)
      if (
        keys.length > 50 &&
        (key.includes('_private') || key.includes('_store'))
      ) {
        childNode.type = 'CytoscapeInternal'
        childNode.children = []
      } else if (
        key === 'visualStyles' ||
        (key.includes('visualStyle') && keys.length > 10)
      ) {
        // For visual styles, just show the type without all the property details
        childNode.type = inferType(key, value, context)
        childNode.children = [] // Don't show individual visual properties
      } else {
        const childAnalysis = analyzeState(value, [...context, key], maxDepth)
        childNode.children = childAnalysis.children
        // Use the inferred type from analysis if it's more specific
        if (
          childAnalysis.type !== 'object' &&
          childAnalysis.type !== 'ApplicationState' &&
          childAnalysis.type !== childType
        ) {
          childNode.type = childAnalysis.type
        }
        childNode.isRecord = childAnalysis.isRecord
        childNode.isArray = childAnalysis.isArray
      }
    }

    node.children.push(childNode)
  }

  return node
}

/**
 * Generate Mermaid diagram from state graph
 */
function generateMermaidDiagram(graph: StateGraph): string {
  const mermaidInit = {
    theme: 'base',
    themeVariables: {
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '16px',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#111827',
      primaryBorderColor: '#1D4ED8',
      lineColor: '#1D4ED8',
      clusterBkg: '#F8FAFC',
      clusterBorder: '#94A3B8',
    },
    flowchart: {
      curve: 'basis',
      defaultRenderer: 'elk',
      htmlLabels: true,
      nodeSpacing: 120,
      rankSpacing: 180,
      padding: 24,
      useMaxWidth: false,
    },
  }

  let mermaid = `%%{init: ${JSON.stringify(mermaidInit)} }%%\n`
  mermaid += 'graph TB\n\n'

  const nodeIds = new Map<string, string>()
  const nodeStyles = new Map<string, string>()
  let nodeCounter = 0

  function getNodeId(name: string): string {
    if (!nodeIds.has(name)) {
      const id = `N${nodeCounter++}`
      nodeIds.set(name, id)
      return id
    }
    return nodeIds.get(name)!
  }

  function renderNode(
    node: StateNode,
    parentPath: string = '',
    isStore: boolean = false,
  ): void {
    const fullPath = parentPath ? `${parentPath}.${node.name}` : node.name
    const nodeId = getNodeId(fullPath)

    // Create node label with type
    let label = node.name
    if (
      node.type &&
      node.type !== node.name &&
      !node.type.includes(node.name)
    ) {
      // Format type nicely
      const typeLabel = node.type
        .replace(/Record<IdType, /g, 'Record<IdType,<br/>')
        .replace(/>/g, '<br/>>')
      label = `${node.name}<br/><i style="font-size:12px">${typeLabel}</i>`
    } else if (node.type && node.type !== node.name) {
      label = `${node.name}<br/><i style="font-size:12px">${node.type}</i>`
    }

    // Determine if this is a store node (only top-level stores)
    const isStoreNode =
      (parentPath === 'stores' && node.children.length > 0) ||
      (parentPath.startsWith('stores.') && parentPath.split('.').length === 2)

    mermaid += `    ${nodeId}["${label}"]\n`

    // Store style class for later application
    if (isStoreNode) {
      nodeStyles.set(nodeId, 'storeNode')
    } else if (node.isRecord || node.type.includes('Record<')) {
      nodeStyles.set(nodeId, 'recordNode')
    } else if (node.isArray || node.type.endsWith('[]')) {
      nodeStyles.set(nodeId, 'arrayNode')
    } else if (
      node.type &&
      (node.type.includes('Map<') ||
        node.type.includes('Table') ||
        node.type.includes('Style') ||
        node.type.includes('View') ||
        node.type.includes('Network') ||
        node.type.includes('Workspace'))
    ) {
      nodeStyles.set(nodeId, 'typeNode')
    } else if (
      typeof node.type === 'string' &&
      (node.type === 'string' ||
        node.type === 'number' ||
        node.type === 'boolean')
    ) {
      nodeStyles.set(nodeId, 'primitiveNode')
    } else {
      nodeStyles.set(nodeId, 'typeNode')
    }

    // Render children and edges
    for (const child of node.children) {
      const childPath = `${fullPath}.${child.name}`
      const childId = getNodeId(childPath)

      renderNode(child, fullPath, isStoreNode)

      // Add edge
      mermaid += `    ${nodeId} --> ${childId}\n`
    }
  }

  // Render root and all children
  // Special handling for stores structure
  if (
    graph.root.name === 'ApplicationState' &&
    graph.root.children.length > 0
  ) {
    // Check if we have a 'stores' child
    const storesChild = graph.root.children.find((c) => c.name === 'stores')
    if (storesChild) {
      // Render stores as a subgraph
      mermaid += '    subgraph stores_subgraph["Stores"]\n'
      mermaid += '        direction TB\n'

      // First, render all store nodes
      for (const store of storesChild.children) {
        const storePath = `stores.${store.name}`
        const storeId = getNodeId(storePath)
        const storeLabel = store.name
        mermaid += `        ${storeId}["${storeLabel}"]\n`
      }

      mermaid += '    end\n\n'

      // Now render store children and their relationships
      for (const store of storesChild.children) {
        const storePath = `stores.${store.name}`
        const storeId = getNodeId(storePath)

        // Render children of this store
        for (const child of store.children) {
          renderNode(child, storePath, true)
          const childId = getNodeId(`${storePath}.${child.name}`)
          mermaid += `    ${storeId} --> ${childId}\n`
        }
      }

      // Render other root children (like summary)
      for (const child of graph.root.children) {
        if (child.name !== 'stores') {
          renderNode(child, '')
          const rootId = getNodeId('ApplicationState')
          const childId = getNodeId(child.name)
          mermaid += `    ${rootId} --> ${childId}\n`
        }
      }

      // Add edge from root to stores subgraph
      const rootId = getNodeId('ApplicationState')
      const storesSubgraphId = 'stores_subgraph'
      mermaid += `    ${rootId} -.-> ${storesSubgraphId}\n`
    } else {
      renderNode(graph.root)
    }
  } else {
    renderNode(graph.root)
  }

  // Add styling classes
  mermaid += '\n'
  mermaid +=
    '    classDef storeNode fill:#fff3e0,stroke:#e65100,stroke-width:3px\n'
  mermaid +=
    '    classDef recordNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n'
  mermaid +=
    '    classDef arrayNode fill:#e1f5ff,stroke:#01579b,stroke-width:2px\n'
  mermaid +=
    '    classDef typeNode fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px\n'
  mermaid +=
    '    classDef primitiveNode fill:#f5f5f5,stroke:#757575,stroke-width:1px\n'

  // Apply styles to nodes
  for (const [nodeId, styleClass] of nodeStyles.entries()) {
    mermaid += `    class ${nodeId} ${styleClass}\n`
  }

  return mermaid
}

/**
 * Main function
 */
function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error(
      'Usage: npx ts-node generate-state-diagram.ts <state-json-file>',
    )
    process.exit(1)
  }

  const jsonFilePath = args[0]

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`File not found: ${jsonFilePath}`)
    process.exit(1)
  }

  console.log(`Reading state file: ${jsonFilePath}`)
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8')
  const jsonData = JSON.parse(jsonContent)

  console.log('Analyzing state structure...')
  const rootNode = analyzeState(jsonData, [])

  const graph: StateGraph = {
    root: rootNode,
    edges: [],
  }

  console.log('Generating Mermaid diagram...')
  const mermaid = generateMermaidDiagram(graph)

  // Write output
  const outputDir = path.join(__dirname)
  const mermaidPath = path.join(outputDir, 'state-structure-diagram.mmd')
  fs.writeFileSync(mermaidPath, mermaid)

  console.log(`\nGenerated diagram: ${mermaidPath}`)
  console.log('\nDiagram preview:')
  console.log(mermaid.substring(0, 500) + '...\n')
}

if (require.main === module) {
  main()
}
