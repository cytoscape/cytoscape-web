#!/usr/bin/env ts-node
/**
 * Script to generate all CX2 and HCX test fixtures as specified in TEST_RESOURCES_COMPREHENSIVE.md
 *
 * This script uses generate-cx2.ts and generate-hcx.ts to generate all required test cases for:
 * - Valid CX2 files (minimal, small, medium, large, with various characteristics)
 * - Invalid CX2 files (missing CXVersion, duplicate IDs, invalid references, etc.)
 * - Valid HCX files (with/without interaction UUID, fully compliant, etc.)
 * - Invalid HCX files (missing metadata, invalid schema version, etc.)
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-all-cx2.ts
 */

import { spawn } from 'child_process'
import { join } from 'path'

const CX2_OUTPUT_DIR = join(__dirname, '../../test/fixtures/cx2')
const HCX_OUTPUT_DIR = join(__dirname, '../../test/fixtures/hcx')

interface Cx2GenerationTask {
  name: string
  type: string
  args: string[]
  output: string
  category: string
}

/**
 * Runs generate-cx2.ts with the given arguments
 */
async function generateCx2(
  type: string,
  args: string[],
  output: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'generate-cx2.ts')
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
        reject(new Error(`generate-cx2.ts exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Runs generate-hcx.ts with the given arguments
 */
async function generateHcx(
  type: string,
  args: string[],
  output: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'generate-hcx.ts')
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
        reject(new Error(`generate-hcx.ts exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Generates all CX2 and HCX test fixtures
 */
async function generateAllCx2(): Promise<void> {
  const cx2Tasks: Cx2GenerationTask[] = [
    // Basic Valid CX2 Files
    {
      name: 'Minimal valid CX2',
      type: 'minimal',
      args: [],
      output: join(CX2_OUTPUT_DIR, 'valid', 'minimal.valid.cx2'),
      category: 'Basic Valid',
    },
    {
      name: 'Small network',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-attributes', '--with-network-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'small-network.valid.cx2'),
      category: 'Basic Valid',
    },
    {
      name: 'Medium network',
      type: 'medium',
      args: ['--nodes', '100', '--edges', '200', '--with-visual-style', '--with-attributes', '--with-network-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'medium-network.valid.cx2'),
      category: 'Basic Valid',
    },
    {
      name: 'Large network',
      type: 'large',
      args: ['--nodes', '500', '--edges', '800', '--with-visual-style', '--with-attributes', '--with-network-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'large-network.valid.cx2'),
      category: 'Basic Valid',
    },

    // CX2 Files with Layout Information
    {
      name: 'With Cartesian coordinates',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-layout', '--with-attributes'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-cartesian-layout.valid.cx2'),
      category: 'Layout',
    },
    {
      name: 'Without layout',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'without-layout.valid.cx2'),
      category: 'Layout',
    },

    // CX2 Files with Visual Styles
    {
      name: 'With complete visual style',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-visual-style', '--with-attributes'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-visual-style.valid.cx2'),
      category: 'Visual Style',
    },
    {
      name: 'Without visual style',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'without-visual-style.valid.cx2'),
      category: 'Visual Style',
    },

    // CX2 Files with Network Attributes
    {
      name: 'With network attributes',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-network-attributes'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-network-attributes.valid.cx2'),
      category: 'Network Attributes',
    },
    {
      name: 'With attribute declarations',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-attribute-declarations', '--with-attributes'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-attribute-declarations.valid.cx2'),
      category: 'Network Attributes',
    },

    // CX2 Files with Opaque Aspects
    {
      name: 'With opaque aspects',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-opaque-aspects'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-opaque-aspects.valid.cx2'),
      category: 'Opaque Aspects',
    },
    {
      name: 'With multiple opaque aspects',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-opaque-aspects'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'with-multiple-opaque-aspects.valid.cx2'),
      category: 'Opaque Aspects',
    },

    // CX2 Files with Node/Edge Attributes
    {
      name: 'Rich node attributes',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'rich-node-attributes.valid.cx2'),
      category: 'Attributes',
    },
    {
      name: 'Rich edge attributes',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'rich-edge-attributes.valid.cx2'),
      category: 'Attributes',
    },

    // CX2 Files from Different Sources
    {
      name: 'NDEx-exported CX2',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-network-attributes', '--with-attributes', '--with-attribute-declarations'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'ndex-exported.valid.cx2'),
      category: 'Sources',
    },
    {
      name: 'Local-created CX2',
      type: 'small',
      args: ['--nodes', '20', '--edges', '30', '--with-network-attributes'],
      output: join(CX2_OUTPUT_DIR, 'valid', 'local-created.valid.cx2'),
      category: 'Sources',
    },

    // Invalid CX2 Files - Structure Validation Errors
    {
      name: 'Not an array',
      type: 'invalid',
      args: ['--error', 'not-array'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'not-array.invalid.cx2'),
      category: 'Invalid Structure',
    },
    {
      name: 'Empty array',
      type: 'invalid',
      args: ['--error', 'empty-array'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'empty-array.invalid.cx2'),
      category: 'Invalid Structure',
    },
    {
      name: 'Missing CXVersion',
      type: 'invalid',
      args: ['--error', 'missing-cxversion'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'missing-cxversion.invalid.cx2'),
      category: 'Invalid Structure',
    },
    {
      name: 'Wrong CX version',
      type: 'invalid',
      args: ['--error', 'wrong-version'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'wrong-version.invalid.cx2'),
      category: 'Invalid Structure',
    },
    {
      name: 'Invalid aspect structure',
      type: 'invalid',
      args: ['--error', 'invalid-aspect-structure'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'invalid-aspect-structure.invalid.cx2'),
      category: 'Invalid Structure',
    },
    {
      name: 'Missing status aspect',
      type: 'invalid',
      args: ['--error', 'missing-status'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'missing-status.invalid.cx2'),
      category: 'Invalid Structure',
    },

    // Invalid CX2 Files - Referential Integrity Errors
    {
      name: 'Duplicate node IDs',
      type: 'invalid',
      args: ['--error', 'duplicate-node-ids'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'duplicate-node-ids.invalid.cx2'),
      category: 'Invalid Referential',
    },
    {
      name: 'Duplicate edge IDs',
      type: 'invalid',
      args: ['--error', 'duplicate-edge-ids'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'duplicate-edge-ids.invalid.cx2'),
      category: 'Invalid Referential',
    },
    {
      name: 'Edge references invalid node',
      type: 'invalid',
      args: ['--error', 'invalid-edge-reference'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'invalid-edge-reference.invalid.cx2'),
      category: 'Invalid Referential',
    },

    // Invalid CX2 Files - Malformed JSON
    {
      name: 'Invalid JSON syntax',
      type: 'invalid',
      args: ['--error', 'invalid-json'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'invalid-json.invalid.cx2'),
      category: 'Invalid JSON',
    },
    {
      name: 'Truncated file',
      type: 'invalid',
      args: ['--error', 'truncated'],
      output: join(CX2_OUTPUT_DIR, 'invalid', 'truncated.invalid.cx2'),
      category: 'Invalid JSON',
    },
  ]

  const hcxTasks: Cx2GenerationTask[] = [
    // Valid HCX Files
    {
      name: 'HCX without filter configs',
      type: 'without-filter-configs',
      args: ['--nodes', '50', '--edges', '100'],
      output: join(HCX_OUTPUT_DIR, 'valid', 'without-filter-configs.valid.cx2'),
      category: 'Valid HCX',
    },
    {
      name: 'HCX with interaction UUID',
      type: 'with-interaction-uuid',
      args: ['--nodes', '50', '--edges', '100', '--interaction-uuid', 'test-uuid-123'],
      output: join(HCX_OUTPUT_DIR, 'valid', 'with-interaction-uuid.valid.cx2'),
      category: 'Valid HCX',
    },
    {
      name: 'HCX without interaction UUID',
      type: 'without-interaction-uuid',
      args: ['--nodes', '50', '--edges', '100'],
      output: join(HCX_OUTPUT_DIR, 'valid', 'without-interaction-uuid.valid.cx2'),
      category: 'Valid HCX',
    },
    {
      name: 'Fully compliant HCX',
      type: 'fully-compliant',
      args: ['--nodes', '50', '--edges', '100', '--interaction-uuid', 'test-uuid-123'],
      output: join(HCX_OUTPUT_DIR, 'valid', 'fully-compliant.valid.cx2'),
      category: 'Valid HCX',
    },
    {
      name: 'HCX with warnings',
      type: 'with-warnings',
      args: ['--nodes', '50', '--edges', '100'],
      output: join(HCX_OUTPUT_DIR, 'valid', 'with-warnings.valid.cx2'),
      category: 'Valid HCX',
    },

    // Invalid HCX Files
    {
      name: 'Missing HCX metadata',
      type: 'invalid',
      args: ['--error', 'missing-metadata'],
      output: join(HCX_OUTPUT_DIR, 'invalid', 'missing-metadata.invalid.cx2'),
      category: 'Invalid HCX',
    },
    {
      name: 'Invalid HCX schema version',
      type: 'invalid',
      args: ['--error', 'invalid-schema-version'],
      output: join(HCX_OUTPUT_DIR, 'invalid', 'invalid-schema-version.invalid.cx2'),
      category: 'Invalid HCX',
    },
    {
      name: 'Invalid filter config structure',
      type: 'invalid',
      args: ['--error', 'invalid-filter-config'],
      output: join(HCX_OUTPUT_DIR, 'invalid', 'invalid-filter-config.invalid.cx2'),
      category: 'Invalid HCX',
    },
    {
      name: 'HCX not a DAG',
      type: 'invalid',
      args: ['--error', 'not-dag'],
      output: join(HCX_OUTPUT_DIR, 'invalid', 'not-dag.invalid.cx2'),
      category: 'Invalid HCX',
    },
  ]

  console.log('Generating CX2 and HCX test fixtures...\n')

  // Generate CX2 files
  for (const task of cx2Tasks) {
    try {
      console.log(`Generating: ${task.name}`)
      await generateCx2(task.type, task.args, task.output)
      console.log(`✓ ${task.name}\n`)
    } catch (error) {
      console.error(`✗ Failed to generate ${task.name}:`, error)
      throw error
    }
  }

  // Generate HCX files
  for (const task of hcxTasks) {
    try {
      console.log(`Generating: ${task.name}`)
      await generateHcx(task.type, task.args, task.output)
      console.log(`✓ ${task.name}\n`)
    } catch (error) {
      console.error(`✗ Failed to generate ${task.name}:`, error)
      throw error
    }
  }

  console.log(
    `✓ Successfully generated ${cx2Tasks.length + hcxTasks.length} CX2/HCX test fixtures`,
  )
  console.log(`CX2 output directory: ${CX2_OUTPUT_DIR}`)
  console.log(`HCX output directory: ${HCX_OUTPUT_DIR}`)
}

if (require.main === module) {
  generateAllCx2().catch((error) => {
    console.error('Error generating fixtures:', error)
    process.exit(1)
  })
}

