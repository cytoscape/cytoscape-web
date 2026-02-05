#!/usr/bin/env ts-node
/**
 * Script to generate all table test fixtures as specified in generate-tables-spec.md
 *
 * This script uses generate-tables.ts to generate all required table test cases for:
 * - Valid table files (CSV, TSV, TXT with various characteristics)
 * - Invalid table files (empty, malformed, inconsistent columns, etc.)
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-all-tables.ts
 */

import { spawn } from 'child_process'
import { join } from 'path'

const OUTPUT_DIR = join(__dirname, '../../test/fixtures/tables')

interface TableGenerationTask {
  name: string
  type: string
  args: string[]
  output: string
  category: string
  description: string
  expectedBehavior: string
}

/**
 * Runs generate-tables.ts with the given arguments
 */
async function generateTable(
  type: string,
  args: string[],
  output: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'generate-tables.ts')
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
        reject(new Error(`generate-tables.ts exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Generates all table test fixtures
 */
async function generateAllTables(): Promise<void> {
  const tasks: TableGenerationTask[] = [
    // Valid CSV files
    {
      name: 'CSV with Headers',
      type: 'csv',
      args: ['--with-headers', '--rows', '10', '--columns', '5'],
      output: join(OUTPUT_DIR, 'csv-with-headers.valid.csv'),
      category: 'Valid CSV',
      description: 'CSV file with header row',
      expectedBehavior: 'Table parses successfully with headers',
    },
    {
      name: 'CSV without Headers',
      type: 'csv',
      args: ['--no-headers', '--rows', '10', '--columns', '5'],
      output: join(OUTPUT_DIR, 'csv-no-headers.valid.csv'),
      category: 'Valid CSV',
      description: 'CSV file without header row',
      expectedBehavior: 'Table parses successfully without headers',
    },
    {
      name: 'CSV with Quoted Values',
      type: 'csv',
      args: ['--with-headers', '--quoted-values', '--rows', '10', '--columns', '5'],
      output: join(OUTPUT_DIR, 'csv-quoted-values.valid.csv'),
      category: 'Valid CSV',
      description: 'CSV file with quoted values',
      expectedBehavior: 'Table parses successfully with quoted values',
    },
    {
      name: 'CSV with Mixed Data Types',
      type: 'csv',
      args: [
        '--with-headers',
        '--data-types',
        'string,number,date,boolean',
        '--rows',
        '10',
        '--columns',
        '4',
      ],
      output: join(OUTPUT_DIR, 'csv-mixed-types.valid.csv'),
      category: 'Valid CSV',
      description: 'CSV file with mixed data types (string, number, date, boolean)',
      expectedBehavior: 'Table parses successfully with mixed data types',
    },
    {
      name: 'CSV European Decimal Format',
      type: 'csv',
      args: [
        '--with-headers',
        '--decimal-delimiter',
        ',',
        '--data-types',
        'string,number',
        '--rows',
        '10',
        '--columns',
        '3',
      ],
      output: join(OUTPUT_DIR, 'csv-european-decimal.valid.csv'),
      category: 'Valid CSV',
      description: 'CSV file with European decimal format (comma as decimal separator)',
      expectedBehavior: 'Table parses successfully with European decimal format',
    },
    {
      name: 'CSV European Format (Semicolon Delimiter)',
      type: 'csv',
      args: [
        '--with-headers',
        '--delimiter',
        ';',
        '--decimal-delimiter',
        ',',
        '--data-types',
        'string,number,number',
        '--rows',
        '10',
        '--columns',
        '3',
      ],
      output: join(OUTPUT_DIR, 'csv-european-format.valid.csv'),
      category: 'Valid CSV',
      description: 'European CSV format: semicolon as field delimiter, comma as decimal separator',
      expectedBehavior: 'Table parses successfully with semicolon delimiter and comma decimals',
    },
    {
      name: 'CSV European Format with Quoted Values',
      type: 'csv',
      args: [
        '--with-headers',
        '--delimiter',
        ';',
        '--decimal-delimiter',
        ',',
        '--quoted-values',
        '--data-types',
        'string,number,string',
        '--rows',
        '10',
        '--columns',
        '3',
      ],
      output: join(OUTPUT_DIR, 'csv-european-quoted.valid.csv'),
      category: 'Valid CSV',
      description: 'European CSV format with quoted values (semicolon delimiter, comma decimals)',
      expectedBehavior: 'Table parses successfully with European format and quoted values',
    },

    // Valid TSV files
    {
      name: 'TSV with Headers',
      type: 'tsv',
      args: ['--with-headers', '--rows', '10', '--columns', '5'],
      output: join(OUTPUT_DIR, 'tsv-with-headers.valid.tsv'),
      category: 'Valid TSV',
      description: 'TSV file with header row',
      expectedBehavior: 'Table parses successfully with headers',
    },
    {
      name: 'TSV without Headers',
      type: 'tsv',
      args: ['--no-headers', '--rows', '10', '--columns', '5'],
      output: join(OUTPUT_DIR, 'tsv-no-headers.valid.tsv'),
      category: 'Valid TSV',
      description: 'TSV file without header row',
      expectedBehavior: 'Table parses successfully without headers',
    },

    // Valid TXT files
    {
      name: 'Space-Delimited TXT',
      type: 'txt',
      args: [
        '--with-headers',
        '--delimiter',
        ' ',
        '--rows',
        '10',
        '--columns',
        '4',
      ],
      output: join(OUTPUT_DIR, 'space-delimited.valid.txt'),
      category: 'Valid TXT',
      description: 'Space-delimited text file',
      expectedBehavior: 'Table parses successfully with space delimiter',
    },
    {
      name: 'Semicolon-Delimited TXT',
      type: 'txt',
      args: [
        '--with-headers',
        '--delimiter',
        ';',
        '--rows',
        '10',
        '--columns',
        '4',
      ],
      output: join(OUTPUT_DIR, 'semicolon-delimited.valid.txt'),
      category: 'Valid TXT',
      description: 'Semicolon-delimited text file',
      expectedBehavior: 'Table parses successfully with semicolon delimiter',
    },

    // Special formats
    {
      name: 'Edge List',
      type: 'csv',
      args: ['--with-headers', '--edge-list', '--rows', '20'],
      output: join(OUTPUT_DIR, 'edge-list.valid.csv'),
      category: 'Valid Special Formats',
      description: 'Edge list format (source, target columns)',
      expectedBehavior: 'Edge list parses successfully',
    },
    {
      name: 'Node Attributes',
      type: 'csv',
      args: ['--with-headers', '--node-attributes', '--rows', '50'],
      output: join(OUTPUT_DIR, 'node-attributes.valid.csv'),
      category: 'Valid Special Formats',
      description: 'Node attributes table (node_id + attributes)',
      expectedBehavior: 'Node attributes table parses successfully',
    },
    {
      name: 'Edge Attributes',
      type: 'csv',
      args: ['--with-headers', '--edge-attributes', '--rows', '30'],
      output: join(OUTPUT_DIR, 'edge-attributes.valid.csv'),
      category: 'Valid Special Formats',
      description: 'Edge attributes table (edge_id + attributes)',
      expectedBehavior: 'Edge attributes table parses successfully',
    },

    // Invalid table files
    {
      name: 'Empty',
      type: 'invalid',
      args: ['--error', 'empty'],
      output: join(OUTPUT_DIR, 'empty.invalid.csv'),
      category: 'Invalid Tables',
      description: 'Empty table file',
      expectedBehavior: 'Validation error for empty file',
    },
    {
      name: 'No Delimiter',
      type: 'invalid',
      args: ['--error', 'no-delimiter'],
      output: join(OUTPUT_DIR, 'no-delimiter.invalid.csv'),
      category: 'Invalid Tables',
      description: 'File without recognizable delimiter',
      expectedBehavior: 'Validation error for missing delimiter',
    },
    {
      name: 'Inconsistent Columns',
      type: 'invalid',
      args: ['--error', 'inconsistent-columns'],
      output: join(OUTPUT_DIR, 'inconsistent-columns.invalid.csv'),
      category: 'Invalid Tables',
      description: 'Rows with different column counts',
      expectedBehavior: 'Validation error for inconsistent columns',
    },
    {
      name: 'Starts with Empty Lines',
      type: 'invalid',
      args: ['--error', 'starts-empty-lines'],
      output: join(OUTPUT_DIR, 'starts-empty-lines.invalid.csv'),
      category: 'Invalid Tables',
      description: 'File starting with empty lines',
      expectedBehavior: 'Validation error for leading empty lines',
    },
    {
      name: 'Malformed Quotes',
      type: 'invalid',
      args: ['--error', 'malformed-quotes'],
      output: join(OUTPUT_DIR, 'malformed-quotes.invalid.csv'),
      category: 'Invalid Tables',
      description: 'CSV file with unclosed quotes',
      expectedBehavior: 'Validation error for malformed quotes',
    },
  ]

  console.log(`Generating ${tasks.length} table test fixtures...\n`)

  for (const task of tasks) {
    try {
      console.log(`Generating: ${task.name}`)
      await generateTable(task.type, task.args, task.output)
      console.log(`✓ ${task.name}\n`)
    } catch (error) {
      console.error(`✗ Failed to generate ${task.name}:`, error)
      throw error
    }
  }

  console.log(`\n✓ Successfully generated ${tasks.length} table test fixtures`)
  console.log(`Output directory: ${OUTPUT_DIR}`)
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    await generateAllTables()
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

