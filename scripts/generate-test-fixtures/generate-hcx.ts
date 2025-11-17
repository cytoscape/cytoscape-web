#!/usr/bin/env ts-node
/**
 * Script to generate HCX (Hierarchical Cell eXchange) test fixtures for Cytoscape Web testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-hcx.ts --type with-filter-configs --output test/fixtures/hcx/with-filter-configs.valid.cx2
 *   npx tsx scripts/generate-test-fixtures/generate-hcx.ts --type with-interaction-uuid --interaction-uuid abc-123 --output test/fixtures/hcx/with-interaction-uuid.valid.cx2
 *   npx tsx scripts/generate-test-fixtures/generate-hcx.ts --type invalid --error missing-metadata --output test/fixtures/hcx/missing-metadata.invalid.cx2
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { generateValidCx2 } from './generate-cx2'

// Default values
const DEFAULT_NODES = 50
const DEFAULT_EDGES = 100

type HcxType =
  | 'with-filter-configs'
  | 'without-filter-configs'
  | 'with-interaction-uuid'
  | 'without-interaction-uuid'
  | 'fully-compliant'
  | 'with-warnings'
  | 'invalid'

type ErrorType =
  | 'missing-metadata'
  | 'invalid-schema-version'
  | 'invalid-filter-config'
  | 'not-dag'

interface GenerateHcxOptions {
  nodeCount: number
  edgeCount: number
  withInteractionUUID: boolean
  interactionUUID?: string
  interactionHost?: string
  modelFileCount: number
  schemaVersion: string
  withFilterWidgets: boolean
}

/**
 * Generate HCX network attributes
 */
function generateHcxNetworkAttributes(
  options: GenerateHcxOptions,
): { name: string; value: any; dataType?: string }[] {
  const {
    withInteractionUUID,
    interactionUUID,
    interactionHost,
    modelFileCount,
    schemaVersion,
  } = options

  const attrs: { name: string; value: any; dataType?: string }[] = [
    {
      name: 'ndexSchema',
      value: schemaVersion,
    },
    {
      name: 'HCX::modelFileCount',
      value: modelFileCount,
    },
  ]

  if (withInteractionUUID && interactionUUID) {
    attrs.push({
      name: 'HCX::interactionNetworkUUID',
      value: interactionUUID,
    })
    if (interactionHost) {
      attrs.push({
        name: 'HCX::interactionNetworkHost',
        value: interactionHost,
      })
    }
  }

  return attrs
}

/**
 * Generate filter widgets aspect (for interaction networks, not HCX)
 */
function generateFilterWidgets(): any {
  return {
    filterWidgets: [
      {
        filter: [
          {
            predicate: 'IS',
            criterion: 'interacts',
            description: 'Interaction type',
          },
          {
            predicate: 'IS',
            criterion: 'binds',
            description: 'Binding interaction',
          },
        ],
        filterMode: 'edge',
        appliesTo: 'edges',
        attributeName: 'interaction',
        mappingSource: 'EDGE_LINE_COLOR',
        label: 'Interaction type',
        widgetType: 'checkboxes',
      },
    ],
  }
}

/**
 * Generate HCX members for nodes (hierarchical structure)
 */
function generateHcxMembers(nodeIndex: number, totalNodes: number): number[] {
  // Create a simple hierarchical structure
  // Each node can have members that are leaf nodes
  if (nodeIndex < totalNodes / 2) {
    // Internal nodes have members
    const memberCount = Math.floor(Math.random() * 5) + 2
    const members: number[] = []
    for (let i = 0; i < memberCount; i++) {
      const memberId = Math.floor(totalNodes / 2) + (nodeIndex * memberCount + i) % Math.floor(totalNodes / 2)
      if (memberId < totalNodes) {
        members.push(memberId)
      }
    }
    return members.length > 0 ? members : []
  }
  return []
}

/**
 * Generate a valid HCX network
 */
function generateValidHcx(options: GenerateHcxOptions): any[] {
  const {
    nodeCount,
    edgeCount,
    withFilterWidgets,
    schemaVersion,
  } = options

  // Start with a base CX2 network
  const cx2 = generateValidCx2({
    nodeCount,
    edgeCount,
    withLayout: true,
    withVisualStyle: false,
    withAttributes: true,
    withOpaqueAspects: false,
    withNetworkAttributes: true,
    withAttributeDeclarations: true,
  })

  // Find and update networkAttributes
  const networkAttrsIndex = cx2.findIndex((a: any) => a.networkAttributes)
  if (networkAttrsIndex >= 0) {
    const hcxAttrs = generateHcxNetworkAttributes(options)
    cx2[networkAttrsIndex].networkAttributes[0] = {
      ...cx2[networkAttrsIndex].networkAttributes[0],
      ...hcxAttrs.reduce((acc, attr) => {
        acc[attr.name] = attr.value
        return acc
      }, {} as any),
    }
  }

  // Update attribute declarations to include HCX::members
  const attrDeclIndex = cx2.findIndex((a: any) => a.attributeDeclarations)
  if (attrDeclIndex >= 0) {
    if (!cx2[attrDeclIndex].attributeDeclarations[0].nodes) {
      cx2[attrDeclIndex].attributeDeclarations[0].nodes = {}
    }
    cx2[attrDeclIndex].attributeDeclarations[0].nodes['HCX::members'] = {
      d: 'list_of_integer',
    }
  }

  // Add HCX::members to nodes
  const nodesIndex = cx2.findIndex((a: any) => a.nodes)
  if (nodesIndex >= 0) {
    cx2[nodesIndex].nodes.forEach((node: any, index: number) => {
      const members = generateHcxMembers(index, nodeCount)
      if (members.length > 0) {
        node.v['HCX::members'] = members
      }
    })
  }

  // Add filter widgets if requested (for interaction networks)
  if (withFilterWidgets) {
    cx2.push(generateFilterWidgets())
  }

  return cx2
}

/**
 * Generate an invalid HCX based on error type
 */
function generateInvalidHcx(errorType: ErrorType, baseNetwork?: any[]): any {
  if (!baseNetwork) {
    const valid = generateValidHcx({
      nodeCount: 20,
      edgeCount: 30,
      withInteractionUUID: true,
      interactionUUID: 'test-uuid',
      interactionHost: 'dev1.ndexbio.org',
      modelFileCount: 1,
      schemaVersion: 'hierarchy_v0.1',
      withFilterWidgets: false,
    })
    baseNetwork = JSON.parse(JSON.stringify(valid))
  }

  switch (errorType) {
    case 'missing-metadata':
      // Remove HCX metadata
      const noMetadata = JSON.parse(JSON.stringify(baseNetwork))
      const networkAttrsIndex = noMetadata.findIndex((a: any) => a.networkAttributes)
      if (networkAttrsIndex >= 0) {
        delete noMetadata[networkAttrsIndex].networkAttributes[0].ndexSchema
        delete noMetadata[networkAttrsIndex].networkAttributes[0]['HCX::modelFileCount']
      }
      return noMetadata

    case 'invalid-schema-version':
      // Wrong schema version
      const wrongVersion = JSON.parse(JSON.stringify(baseNetwork))
      const networkAttrsIndex2 = wrongVersion.findIndex((a: any) => a.networkAttributes)
      if (networkAttrsIndex2 >= 0) {
        wrongVersion[networkAttrsIndex2].networkAttributes[0].ndexSchema = 'hierarchy_v2.0'
      }
      return wrongVersion

    case 'invalid-filter-config':
      // Malformed filter widgets
      const invalidFilter = JSON.parse(JSON.stringify(baseNetwork))
      const filterIndex = invalidFilter.findIndex((a: any) => a.filterWidgets)
      if (filterIndex >= 0) {
        invalidFilter[filterIndex].filterWidgets[0].filter = 'invalid' // Should be array
      } else {
        invalidFilter.push({
          filterWidgets: [
            {
              invalid: 'structure',
            },
          ],
        })
      }
      return invalidFilter

    case 'not-dag':
      // Create cycles in the network
      const cyclic = JSON.parse(JSON.stringify(baseNetwork))
      const edgesIndex = cyclic.findIndex((a: any) => a.edges)
      if (edgesIndex >= 0 && cyclic[edgesIndex].edges.length >= 3) {
        // Create a cycle: 0 -> 1 -> 2 -> 0
        cyclic[edgesIndex].edges[0].s = 0
        cyclic[edgesIndex].edges[0].t = 1
        cyclic[edgesIndex].edges[1].s = 1
        cyclic[edgesIndex].edges[1].t = 2
        cyclic[edgesIndex].edges[2].s = 2
        cyclic[edgesIndex].edges[2].t = 0
      }
      return cyclic

    default:
      return baseNetwork
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  type: HcxType
  nodeCount?: number
  edgeCount?: number
  interactionUUID?: string
  interactionHost?: string
  modelFileCount?: number
  schemaVersion?: string
  error?: ErrorType
  output: string
} {
  const args = process.argv.slice(2)
  let type: HcxType = 'fully-compliant'
  let nodeCount: number | undefined
  let edgeCount: number | undefined
  let interactionUUID: string | undefined
  let interactionHost: string | undefined
  let modelFileCount: number | undefined
  let schemaVersion: string | undefined
  let error: ErrorType | undefined
  let output = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--type':
      case '-t':
        type = (args[++i] as HcxType) || 'fully-compliant'
        break
      case '--nodes':
      case '-n':
        nodeCount = parseInt(args[++i] || '0', 10)
        break
      case '--edges':
      case '-e':
        edgeCount = parseInt(args[++i] || '0', 10)
        break
      case '--interaction-uuid':
        interactionUUID = args[++i]
        break
      case '--interaction-host':
        interactionHost = args[++i]
        break
      case '--model-file-count':
        modelFileCount = parseInt(args[++i] || '1', 10)
        break
      case '--ndex-schema-version':
        schemaVersion = args[++i]
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

  // Set defaults
  if (!nodeCount) nodeCount = DEFAULT_NODES
  if (!edgeCount) edgeCount = DEFAULT_EDGES
  if (!modelFileCount) modelFileCount = 1
  if (!schemaVersion) schemaVersion = 'hierarchy_v0.1'
  if (!interactionHost) interactionHost = 'dev1.ndexbio.org'

  // Cap at 1000
  if (nodeCount > 1000) nodeCount = 1000
  if (edgeCount > 1000) edgeCount = 1000

  return {
    type,
    nodeCount,
    edgeCount,
    interactionUUID,
    interactionHost,
    modelFileCount,
    schemaVersion,
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

  let hcx: any

  if (args.type === 'invalid') {
    if (!args.error) {
      console.error('Error: --error is required when --type is invalid')
      process.exit(1)
    }
    hcx = generateInvalidHcx(args.error)
  } else {
    const withInteractionUUID =
      args.type === 'with-interaction-uuid' ||
      args.type === 'fully-compliant' ||
      (args.interactionUUID !== undefined)

    const withFilterWidgets =
      args.type === 'with-filter-configs' ||
      args.type === 'fully-compliant'

    hcx = generateValidHcx({
      nodeCount: args.nodeCount || DEFAULT_NODES,
      edgeCount: args.edgeCount || DEFAULT_EDGES,
      withInteractionUUID,
      interactionUUID: args.interactionUUID || (withInteractionUUID ? 'test-uuid-123' : undefined),
      interactionHost: args.interactionHost,
      modelFileCount: args.modelFileCount || 1,
      schemaVersion: args.schemaVersion || 'hierarchy_v0.1',
      withFilterWidgets,
    })
  }

  // Ensure output directory exists
  const outputDir = dirname(args.output)
  mkdirSync(outputDir, { recursive: true })

  // Write file
  writeFileSync(args.output, JSON.stringify(hcx, null, 2), 'utf-8')

  console.log(`✓ Generated HCX file: ${args.output}`)
  if (args.type !== 'invalid') {
    console.log(`  Type: ${args.type}`)
    console.log(`  Nodes: ${args.nodeCount || DEFAULT_NODES}`)
    console.log(`  Edges: ${args.edgeCount || DEFAULT_EDGES}`)
  } else {
    console.log(`  Error type: ${args.error}`)
  }
}

if (require.main === module) {
  main()
}

