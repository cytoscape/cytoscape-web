#!/usr/bin/env ts-node
/**
 * Script to generate all SIF test fixtures as specified in generate-sif-spec.md
 *
 * This script uses generate-sif.ts to generate all required SIF test cases for:
 * - Valid SIF files (simple, multiple-interactions, with-self-loops, complex-names, various-interactions)
 * - Invalid SIF files (empty, malformed, missing-interaction, invalid-syntax)
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-all-sif.ts
 */

import { spawn } from 'child_process'
import { join } from 'path'

const OUTPUT_DIR = join(__dirname, '../../test/fixtures/sif')

interface SIFGenerationTask {
  name: string
  type: string
  args: string[]
  output: string
  category: string
  description: string
  expectedBehavior: string
}

/**
 * Runs generate-sif.ts with the given arguments
 */
async function generateSIF(
  type: string,
  args: string[],
  output: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'generate-sif.ts')
    const child = spawn(
      'npx',
      ['tsx', scriptPath, '--type', type, ...args, '--output', output],
      {
        stdio: 'inherit',
        shell: false,
      },
    )

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`generate-sif.ts exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Generates all SIF test fixtures
 */
async function generateAllSIF(): Promise<void> {
  const tasks: SIFGenerationTask[] = [
    // Valid SIF files
    {
      name: 'Simple',
      type: 'simple',
      args: ['--nodes', '10', '--edges', '15'],
      output: join(OUTPUT_DIR, 'simple.valid.sif'),
      category: 'Valid SIF',
      description: 'Basic SIF with simple interactions',
      expectedBehavior: 'SIF file parses successfully with basic interactions',
    },
    {
      name: 'Multiple Interactions',
      type: 'multiple-interactions',
      args: [
        '--nodes',
        '10',
        '--edges',
        '20',
        '--interaction-types',
        'binds,regulates,activates',
      ],
      output: join(OUTPUT_DIR, 'multiple-interactions.valid.sif'),
      category: 'Valid SIF',
      description: 'SIF with multiple different interaction types',
      expectedBehavior: 'SIF file parses successfully with multiple interaction types',
    },
    {
      name: 'With Self-Loops',
      type: 'with-self-loops',
      args: [
        '--nodes',
        '10',
        '--edges',
        '15',
        '--self-loop-probability',
        '0.2',
      ],
      output: join(OUTPUT_DIR, 'with-self-loops.valid.sif'),
      category: 'Valid SIF',
      description: 'SIF file with self-loops (node connects to itself)',
      expectedBehavior: 'SIF file parses successfully with self-loops',
    },
    {
      name: 'Complex Node Names',
      type: 'complex-names',
      args: ['--nodes', '10', '--edges', '15', '--complex-names'],
      output: join(OUTPUT_DIR, 'complex-node-names.valid.sif'),
      category: 'Valid SIF',
      description: 'SIF with node names containing special characters (spaces, hyphens, underscores, dots)',
      expectedBehavior: 'SIF file parses successfully with complex node names',
    },
    {
      name: 'Complex Node Names (Tabs)',
      type: 'complex-names',
      args: [
        '--nodes',
        '10',
        '--edges',
        '15',
        '--complex-names',
        '--use-tabs',
      ],
      output: join(OUTPUT_DIR, 'complex-node-names-tabs.valid.sif'),
      category: 'Valid SIF',
      description: 'SIF with complex node names using tabs as delimiter',
      expectedBehavior: 'SIF file parses successfully with tabs as delimiter',
    },
    {
      name: 'Various Interactions',
      type: 'various-interactions',
      args: [
        '--nodes',
        '10',
        '--edges',
        '20',
        '--interaction-types',
        'pp,pd,controls,catalyzes',
      ],
      output: join(OUTPUT_DIR, 'various-interactions.valid.sif'),
      category: 'Valid SIF',
      description: 'SIF with various biological interaction types (pp, pd, etc.)',
      expectedBehavior: 'SIF file parses successfully with various interaction types',
    },

    // Invalid SIF files
    {
      name: 'Empty',
      type: 'invalid',
      args: ['--error', 'empty'],
      output: join(OUTPUT_DIR, 'empty.invalid.sif'),
      category: 'Invalid SIF',
      description: 'Empty SIF file',
      expectedBehavior: 'Validation error for empty file',
    },
    {
      name: 'Malformed',
      type: 'invalid',
      args: ['--error', 'malformed'],
      output: join(OUTPUT_DIR, 'malformed.invalid.sif'),
      category: 'Invalid SIF',
      description: 'SIF file with malformed lines not in SIF format',
      expectedBehavior: 'Validation errors for malformed lines',
    },
    {
      name: 'Missing Interaction',
      type: 'invalid',
      args: ['--error', 'missing-interaction'],
      output: join(OUTPUT_DIR, 'missing-interaction.invalid.sif'),
      category: 'Invalid SIF',
      description: 'SIF file with missing interaction type (only nodes, no interaction)',
      expectedBehavior: 'Validation error for missing interaction type',
    },
    {
      name: 'Invalid Syntax',
      type: 'invalid',
      args: ['--error', 'invalid-syntax'],
      output: join(OUTPUT_DIR, 'invalid-syntax.invalid.sif'),
      category: 'Invalid SIF',
      description: 'SIF file with wrong arrow syntax (->, =>, -->)',
      expectedBehavior: 'Validation error for invalid syntax',
    },
  ]

  console.log(`Generating ${tasks.length} SIF test fixtures...\n`)

  for (const task of tasks) {
    try {
      console.log(`Generating: ${task.name}`)
      await generateSIF(task.type, task.args, task.output)
      console.log(`✓ ${task.name}\n`)
    } catch (error) {
      console.error(`✗ Failed to generate ${task.name}:`, error)
      throw error
    }
  }

  console.log(`\n✓ Successfully generated ${tasks.length} SIF test fixtures`)
  console.log(`Output directory: ${OUTPUT_DIR}`)
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    await generateAllSIF()
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

