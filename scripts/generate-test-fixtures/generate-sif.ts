#!/usr/bin/env ts-node
/**
 * Script to generate SIF (Simple Interaction Format) test fixtures for Cytoscape Web testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-sif.ts --type simple --nodes 5 --edges 10 --output test/fixtures/sif/simple.valid.sif
 *   npx tsx scripts/generate-test-fixtures/generate-sif.ts --type with-self-loops --nodes 5 --edges 10 --output test/fixtures/sif/with-self-loops.valid.sif
 *   npx tsx scripts/generate-test-fixtures/generate-sif.ts --type invalid --error missing-interaction --output test/fixtures/sif/missing-interaction.invalid.sif
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Default values
const DEFAULT_NODES = 10
const DEFAULT_EDGES = 15
const DEFAULT_INTERACTION_TYPE = 'interacts'
const DEFAULT_SELF_LOOP_PROBABILITY = 0.0

// Common interaction types
const INTERACTION_TYPES = [
  'interacts',
  'binds',
  'regulates',
  'activates',
  'inhibits',
  'pp',
  'pd',
  'controls',
  'catalyzes',
]

type SIFType =
  | 'simple'
  | 'multiple-interactions'
  | 'with-self-loops'
  | 'complex-names'
  | 'various-interactions'
  | 'invalid'

type ErrorType = 'empty' | 'malformed' | 'missing-interaction' | 'invalid-syntax'

interface GenerateSIFOptions {
  nodeCount: number
  edgeCount: number
  interactionTypes: string[]
  selfLoopProbability: number
  useComplexNames: boolean
  useTabs?: boolean
}

/**
 * Generates simple node names
 */
function generateSimpleNodeName(index: number): string {
  return `node${index + 1}`
}

/**
 * Generates complex node names with special characters
 */
function generateComplexNodeName(index: number): string {
  const patterns = [
    `node-${index + 1}`,
    `node_${index + 1}`,
    `node.${index + 1}`,
    `node ${index + 1}`,
    `node-${index + 1} with spaces`,
    `node_with_underscores_${index + 1}`,
    `node.with.dots.${index + 1}`,
  ]
  return patterns[index % patterns.length]
}

/**
 * Generates a valid SIF file
 */
function generateValidSIF(options: GenerateSIFOptions): string {
  const {
    nodeCount,
    edgeCount,
    interactionTypes,
    selfLoopProbability,
    useComplexNames,
    useTabs = false,
  } = options

  const delimiter = useTabs ? '\t' : ' '
  const lines: string[] = []
  const nodeNames: string[] = []

  // Generate node names
  for (let i = 0; i < nodeCount; i++) {
    nodeNames.push(
      useComplexNames ? generateComplexNodeName(i) : generateSimpleNodeName(i),
    )
  }

  // Ensure graph is connected by creating a spanning tree
  for (let i = 1; i < nodeCount; i++) {
    const source = nodeNames[i - 1]
    const target = nodeNames[i]
    const interaction =
      interactionTypes[Math.floor(Math.random() * interactionTypes.length)]
    lines.push(`${source}${delimiter}${interaction}${delimiter}${target}`)
  }

  // Add remaining edges
  const edgesAdded = nodeCount - 1
  for (let i = edgesAdded; i < edgeCount; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount)
    let targetIndex = Math.floor(Math.random() * nodeCount)

    // Add self-loops based on probability
    if (Math.random() < selfLoopProbability) {
      targetIndex = sourceIndex
    }

    const source = nodeNames[sourceIndex]
    const target = nodeNames[targetIndex]
    const interaction =
      interactionTypes[Math.floor(Math.random() * interactionTypes.length)]
    lines.push(`${source}${delimiter}${interaction}${delimiter}${target}`)
  }

  return lines.join('\n')
}

/**
 * Generates an invalid SIF file
 */
function generateInvalidSIF(errorType: ErrorType): string {
  switch (errorType) {
    case 'empty':
      return ''

    case 'malformed':
      return `node1\ninvalid line format here\nnode2 interacts node3\njust some text`

    case 'missing-interaction':
      return `node1 node2\nnode2 node3\nnode3 node1`

    case 'invalid-syntax':
      return `node1 -> node2\nnode2 => node3\nnode3 --> node1`

    default:
      throw new Error(`Unknown error type: ${errorType}`)
  }
}

/**
 * Parses command line arguments
 */
function parseArgs(): {
  type: SIFType
  nodes?: number
  edges?: number
  interactionTypes?: string[]
  selfLoopProbability?: number
  useComplexNames?: boolean
  error?: ErrorType
  output: string
  useTabs?: boolean
} {
  const args = process.argv.slice(2)
  const result: any = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--type':
      case '-t':
        if (nextArg) {
          result.type = nextArg
          i++
        }
        break

      case '--nodes':
      case '-n':
        if (nextArg) {
          result.nodes = parseInt(nextArg, 10)
          i++
        }
        break

      case '--edges':
      case '-e':
        if (nextArg) {
          result.edges = parseInt(nextArg, 10)
          i++
        }
        break

      case '--interaction-types':
        if (nextArg) {
          result.interactionTypes = nextArg
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0)
          i++
        }
        break

      case '--self-loop-probability':
        if (nextArg) {
          result.selfLoopProbability = parseFloat(nextArg)
          i++
        }
        break

      case '--complex-names':
        result.useComplexNames = true
        break

      case '--use-tabs':
        result.useTabs = true
        break

      case '--error':
        if (nextArg) {
          result.error = nextArg
          i++
        }
        break

      case '--output':
      case '-o':
        if (nextArg) {
          result.output = nextArg
          i++
        }
        break
    }
  }

  if (!result.type) {
    throw new Error('--type is required')
  }

  if (!result.output) {
    throw new Error('--output is required')
  }

  if (result.type === 'invalid' && !result.error) {
    throw new Error('--error is required when --type is invalid')
  }

  return result
}

/**
 * Main function
 */
function main(): void {
  try {
    const args = parseArgs()
    const { type, output } = args

    let sifContent: string

    switch (type) {
      case 'simple': {
        const nodeCount = args.nodes || DEFAULT_NODES
        const edgeCount = args.edges || DEFAULT_EDGES
        const interactionTypes = args.interactionTypes || [
          DEFAULT_INTERACTION_TYPE,
        ]

        sifContent = generateValidSIF({
          nodeCount,
          edgeCount,
          interactionTypes,
          selfLoopProbability: 0.0,
          useComplexNames: false,
        })
        break
      }

      case 'multiple-interactions': {
        const nodeCount = args.nodes || DEFAULT_NODES
        const edgeCount = args.edges || DEFAULT_EDGES
        const interactionTypes =
          args.interactionTypes || ['binds', 'regulates', 'activates']

        sifContent = generateValidSIF({
          nodeCount,
          edgeCount,
          interactionTypes,
          selfLoopProbability: 0.0,
          useComplexNames: false,
        })
        break
      }

      case 'with-self-loops': {
        const nodeCount = args.nodes || DEFAULT_NODES
        const edgeCount = args.edges || DEFAULT_EDGES
        const interactionTypes = args.interactionTypes || [
          DEFAULT_INTERACTION_TYPE,
        ]
        const selfLoopProbability =
          args.selfLoopProbability !== undefined
            ? args.selfLoopProbability
            : 0.2

        sifContent = generateValidSIF({
          nodeCount,
          edgeCount,
          interactionTypes,
          selfLoopProbability,
          useComplexNames: false,
        })
        break
      }

      case 'complex-names': {
        const nodeCount = args.nodes || DEFAULT_NODES
        const edgeCount = args.edges || DEFAULT_EDGES
        const interactionTypes = args.interactionTypes || [
          DEFAULT_INTERACTION_TYPE,
        ]

        sifContent = generateValidSIF({
          nodeCount,
          edgeCount,
          interactionTypes,
          selfLoopProbability: 0.0,
          useComplexNames: true,
          useTabs: args.useTabs || false,
        })
        break
      }

      case 'various-interactions': {
        const nodeCount = args.nodes || DEFAULT_NODES
        const edgeCount = args.edges || DEFAULT_EDGES
        const interactionTypes =
          args.interactionTypes || ['pp', 'pd', 'controls', 'catalyzes']

        sifContent = generateValidSIF({
          nodeCount,
          edgeCount,
          interactionTypes,
          selfLoopProbability: 0.0,
          useComplexNames: false,
        })
        break
      }

      case 'invalid': {
        if (!args.error) {
          throw new Error('--error is required for invalid type')
        }
        sifContent = generateInvalidSIF(args.error)
        break
      }

      default:
        throw new Error(`Unknown type: ${type}`)
    }

    // Ensure output directory exists
    const outputDir = dirname(output)
    mkdirSync(outputDir, { recursive: true })

    // Write SIF content to file
    writeFileSync(output, sifContent, 'utf-8')

    console.log(`✓ Generated SIF file: ${output}`)
    console.log(`  Type: ${type}`)
    if (type !== 'invalid') {
      console.log(`  Nodes: ${args.nodes || DEFAULT_NODES}`)
      console.log(`  Edges: ${args.edges || DEFAULT_EDGES}`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

