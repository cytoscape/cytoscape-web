#!/usr/bin/env ts-node
/**
 * Script to generate CX2 test fixtures for Cytoscape Web testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-cx2.ts --type minimal --output test/fixtures/cx2/minimal.valid.cx2
 *   npx tsx scripts/generate-test-fixtures/generate-cx2.ts --type small --nodes 20 --edges 30 --with-layout --output test/fixtures/cx2/small-network.valid.cx2
 *   npx tsx scripts/generate-test-fixtures/generate-cx2.ts --type invalid --error missing-cxversion --output test/fixtures/cx2/missing-cxversion.invalid.cx2
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Default values
const DEFAULT_NODES = {
  minimal: 2,
  small: 20,
  medium: 100,
  large: 500,
}

const DEFAULT_EDGES = {
  minimal: 1,
  small: 30,
  medium: 200,
  large: 800,
}

type Cx2Type = 'minimal' | 'small' | 'medium' | 'large' | 'invalid'
type ErrorType =
  | 'missing-cxversion'
  | 'wrong-version'
  | 'not-array'
  | 'empty-array'
  | 'missing-status'
  | 'duplicate-node-ids'
  | 'duplicate-edge-ids'
  | 'invalid-edge-reference'
  | 'invalid-bypass-reference'
  | 'attribute-type-mismatch'
  | 'invalid-aspect-structure'
  | 'invalid-json'
  | 'truncated'

interface GenerateCx2Options {
  nodeCount: number
  edgeCount: number
  withLayout: boolean
  withVisualStyle: boolean
  withAttributes: boolean
  withOpaqueAspects: boolean
  withNetworkAttributes: boolean
  withAttributeDeclarations: boolean
}

/**
 * Generate deterministic node names
 */
function generateNodeName(index: number): string {
  return `node${index + 1}`
}

/**
 * Generate deterministic interaction types
 */
function generateInteractionType(index: number): string {
  const types = ['interacts', 'binds', 'regulates', 'activates', 'inhibits']
  return types[index % types.length]
}

/**
 * Generate deterministic coordinates
 */
function generateCoordinates(index: number, nodeCount: number): { x: number; y: number } {
  // Generate a deterministic grid layout
  const cols = Math.ceil(Math.sqrt(nodeCount))
  const row = Math.floor(index / cols)
  const col = index % cols
  return {
    x: col * 100 + 50,
    y: row * 100 + 50,
  }
}

/**
 * Generate a valid CX2 structure
 */
export function generateValidCx2(options: GenerateCx2Options): any[] {
  const {
    nodeCount,
    edgeCount,
    withLayout,
    withVisualStyle,
    withAttributes,
    withOpaqueAspects,
    withNetworkAttributes,
    withAttributeDeclarations,
  } = options

  const cx2: any[] = []

  // 1. CXVersion
  cx2.push({
    CXVersion: '2.0',
    hasFragments: false,
  })

  // 2. MetaData
  const metaData: any[] = [
    {
      name: 'nodes',
      elementCount: nodeCount,
      version: '1.0',
      idCounter: nodeCount - 1,
      propertyCounter: 0,
      consistencyGroup: 1,
    },
    {
      name: 'edges',
      elementCount: edgeCount,
      version: '1.0',
      idCounter: edgeCount - 1,
      propertyCounter: 0,
      consistencyGroup: 1,
    },
  ]

  if (withNetworkAttributes) {
    metaData.push({
      name: 'networkAttributes',
      elementCount: 1,
      version: '1.0',
      idCounter: 0,
      propertyCounter: 0,
      consistencyGroup: 1,
    })
  }

  if (withAttributeDeclarations) {
    metaData.push({
      name: 'attributeDeclarations',
      elementCount: 1,
      version: '1.0',
      idCounter: 0,
      propertyCounter: 0,
      consistencyGroup: 1,
    })
  }

  if (withVisualStyle) {
    metaData.push({
      name: 'visualProperties',
      elementCount: 1,
      version: '1.0',
      idCounter: 0,
      propertyCounter: 0,
      consistencyGroup: 1,
    })
  }

  cx2.push({ metaData })

  // 3. Status (required)
  cx2.push({
    status: [
      {
        error: '',
        success: true,
      },
    ],
  })

  // 4. Attribute Declarations (optional)
  if (withAttributeDeclarations) {
    const declarations: any = {
      nodes: {
        n: {
          a: 'n',
          d: 'string',
        },
      },
      edges: {
        interaction: {
          a: 'i',
          d: 'string',
        },
      },
    }

    if (withAttributes) {
      declarations.nodes.type = { d: 'string' }
      declarations.nodes.score = { d: 'double' }
      declarations.edges.weight = { d: 'double' }
    }

    cx2.push({ attributeDeclarations: [declarations] })
  }

  // 5. Network Attributes (optional)
  if (withNetworkAttributes) {
    const networkAttrs: any[] = [
      {
        name: `Test Network ${nodeCount} nodes`,
        description: 'Generated test network',
      },
    ]
    cx2.push({ networkAttributes: networkAttrs })
  }

  // 6. Nodes
  const nodes: any[] = []
  for (let i = 0; i < nodeCount; i++) {
    const node: any = {
      id: i,
    }

    if (withLayout) {
      const coords = generateCoordinates(i, nodeCount)
      node.x = coords.x
      node.y = coords.y
    }

    const v: any = {
      n: generateNodeName(i),
    }

    if (withAttributes) {
      v.type = i % 2 === 0 ? 'protein' : 'gene'
      v.score = (i * 0.1).toFixed(2)
    }

    node.v = v
    nodes.push(node)
  }
  cx2.push({ nodes })

  // 7. Edges
  const edges: any[] = []
  for (let i = 0; i < edgeCount; i++) {
    const source = i % nodeCount
    const target = (i + 1) % nodeCount
    const edge: any = {
      id: i,
      s: source,
      t: target,
    }

    const v: any = {
      interaction: generateInteractionType(i),
    }

    if (withAttributes) {
      v.weight = (i * 0.05).toFixed(2)
    }

    edge.v = v
    edges.push(edge)
  }
  cx2.push({ edges })

  // 8. Visual Properties (optional)
  if (withVisualStyle) {
    cx2.push({
      visualProperties: [
        {
          properties: [
            {
              n: 'NODE_FILL_COLOR',
              v: '#FF0000',
            },
            {
              n: 'NODE_SIZE',
              v: '20',
            },
          ],
          mappings: [],
          dependencies: {},
          cytoscapeVersion: '3.0',
        },
      ],
    })
  }

  // 9. Opaque Aspects (optional)
  if (withOpaqueAspects) {
    cx2.push({
      customAspect: [
        {
          key: 'value',
          data: 'test',
        },
      ],
    })
  }

  return cx2
}

/**
 * Generate an invalid CX2 based on error type
 */
function generateInvalidCx2(errorType: ErrorType, baseNetwork?: any[]): any {
  if (!baseNetwork) {
    // Generate a minimal valid network first
    const valid = generateValidCx2({
      nodeCount: 2,
      edgeCount: 1,
      withLayout: false,
      withVisualStyle: false,
      withAttributes: false,
      withOpaqueAspects: false,
      withNetworkAttributes: false,
      withAttributeDeclarations: false,
    })
    baseNetwork = JSON.parse(JSON.stringify(valid))
  }

  switch (errorType) {
    case 'missing-cxversion':
      // Remove CXVersion
      return baseNetwork.slice(1)

    case 'wrong-version':
      // Change version to 1.0
      const wrong = JSON.parse(JSON.stringify(baseNetwork))
      wrong[0].CXVersion = '1.0'
      return wrong

    case 'not-array':
      // Return object instead of array
      return { invalid: 'structure' }

    case 'empty-array':
      return []

    case 'missing-status':
      // Remove status aspect
      const noStatus = JSON.parse(JSON.stringify(baseNetwork))
      return noStatus.filter((aspect: any) => !aspect.status)

    case 'duplicate-node-ids':
      // Duplicate first node ID
      const dupNodes = JSON.parse(JSON.stringify(baseNetwork))
      const nodesAspect = dupNodes.find((a: any) => a.nodes)
      if (nodesAspect && nodesAspect.nodes.length > 0) {
        const firstNode = JSON.parse(JSON.stringify(nodesAspect.nodes[0]))
        nodesAspect.nodes.push(firstNode)
      }
      return dupNodes

    case 'duplicate-edge-ids':
      // Duplicate first edge ID
      const dupEdges = JSON.parse(JSON.stringify(baseNetwork))
      const edgesAspect = dupEdges.find((a: any) => a.edges)
      if (edgesAspect && edgesAspect.edges.length > 0) {
        const firstEdge = JSON.parse(JSON.stringify(edgesAspect.edges[0]))
        edgesAspect.edges.push(firstEdge)
      }
      return dupEdges

    case 'invalid-edge-reference':
      // Edge references non-existent node
      const invalidRef = JSON.parse(JSON.stringify(baseNetwork))
      const edgesAspect2 = invalidRef.find((a: any) => a.edges)
      if (edgesAspect2 && edgesAspect2.edges.length > 0) {
        edgesAspect2.edges[0].s = 99999 // Non-existent node
      }
      return invalidRef

    case 'invalid-aspect-structure':
      // Aspect with multiple keys
      return [
        { CXVersion: '2.0' },
        {
          invalidAspect: [],
          anotherKey: [],
        },
      ]

    case 'invalid-json':
      // Return invalid JSON string (caller should handle this)
      return '{"invalid": json}'

    case 'truncated':
      // Truncate the JSON
      const truncated = JSON.parse(JSON.stringify(baseNetwork))
      const jsonStr = JSON.stringify(truncated)
      return jsonStr.substring(0, jsonStr.length - 10) // Remove last 10 chars

    default:
      return baseNetwork
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  type: Cx2Type
  nodeCount?: number
  edgeCount?: number
  withLayout: boolean
  withVisualStyle: boolean
  withAttributes: boolean
  withOpaqueAspects: boolean
  withNetworkAttributes: boolean
  withAttributeDeclarations: boolean
  error?: ErrorType
  output: string
} {
  const args = process.argv.slice(2)
  let type: Cx2Type = 'small'
  let nodeCount: number | undefined
  let edgeCount: number | undefined
  let withLayout = false
  let withVisualStyle = false
  let withAttributes = false
  let withOpaqueAspects = false
  let withNetworkAttributes = false
  let withAttributeDeclarations = false
  let error: ErrorType | undefined
  let output = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--type':
      case '-t':
        type = (args[++i] as Cx2Type) || 'small'
        break
      case '--nodes':
      case '-n':
        nodeCount = parseInt(args[++i] || '0', 10)
        break
      case '--edges':
      case '-e':
        edgeCount = parseInt(args[++i] || '0', 10)
        break
      case '--with-layout':
        withLayout = true
        break
      case '--with-visual-style':
        withVisualStyle = true
        break
      case '--with-attributes':
        withAttributes = true
        break
      case '--with-opaque-aspects':
        withOpaqueAspects = true
        break
      case '--with-network-attributes':
        withNetworkAttributes = true
        break
      case '--with-attribute-declarations':
        withAttributeDeclarations = true
        break
      case '--error':
        error = (args[++i] as ErrorType) || undefined
        break
      case '--output':
      case '-o':
        output = args[++i] || ''
        break
    }
  }

  // Set defaults based on type
  if (!nodeCount && type !== 'invalid') {
    nodeCount = DEFAULT_NODES[type] || DEFAULT_NODES.small
  }
  if (!edgeCount && type !== 'invalid') {
    edgeCount = DEFAULT_EDGES[type] || DEFAULT_EDGES.small
  }

  // Cap at 1000
  if (nodeCount && nodeCount > 1000) nodeCount = 1000
  if (edgeCount && edgeCount > 1000) edgeCount = 1000

  return {
    type,
    nodeCount,
    edgeCount,
    withLayout,
    withVisualStyle,
    withAttributes,
    withOpaqueAspects,
    withNetworkAttributes,
    withAttributeDeclarations,
    error,
    output,
  }
}

/**
 * Main function
 */
function main() {
  const args = parseArgs()

  if (!args.output) {
    console.error('Error: --output is required')
    process.exit(1)
  }

  let cx2: any

  if (args.type === 'invalid') {
    if (!args.error) {
      console.error('Error: --error is required when --type is invalid')
      process.exit(1)
    }
    cx2 = generateInvalidCx2(args.error)
  } else {
    cx2 = generateValidCx2({
      nodeCount: args.nodeCount || DEFAULT_NODES.small,
      edgeCount: args.edgeCount || DEFAULT_EDGES.small,
      withLayout: args.withLayout,
      withVisualStyle: args.withVisualStyle,
      withAttributes: args.withAttributes,
      withOpaqueAspects: args.withOpaqueAspects,
      withNetworkAttributes: args.withNetworkAttributes,
      withAttributeDeclarations: args.withAttributeDeclarations,
    })
  }

  // Ensure output directory exists
  const outputDir = dirname(args.output)
  mkdirSync(outputDir, { recursive: true })

  // Write file
  if (args.error === 'invalid-json' || args.error === 'truncated') {
    // Write as string for invalid JSON
    writeFileSync(args.output, cx2 as string, 'utf-8')
  } else {
    writeFileSync(args.output, JSON.stringify(cx2, null, 2), 'utf-8')
  }

  console.log(`✓ Generated CX2 file: ${args.output}`)
  if (args.type !== 'invalid') {
    console.log(`  Type: ${args.type}`)
    console.log(`  Nodes: ${args.nodeCount || DEFAULT_NODES[args.type]}`)
    console.log(`  Edges: ${args.edgeCount || DEFAULT_EDGES[args.type]}`)
  } else {
    console.log(`  Error type: ${args.error}`)
  }
}

if (require.main === module) {
  main()
}

