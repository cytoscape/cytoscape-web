#!/usr/bin/env ts-node
/**
 * Script to generate table (CSV, TSV, TXT) test fixtures for Cytoscape Web testing.
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-tables.ts --type csv --with-headers --rows 10 --columns 5 --output test/fixtures/tables/csv-with-headers.valid.csv
 *   npx tsx scripts/generate-test-fixtures/generate-tables.ts --type tsv --with-headers --rows 10 --output test/fixtures/tables/tsv-with-headers.valid.tsv
 *   npx tsx scripts/generate-test-fixtures/generate-tables.ts --type invalid --error inconsistent-columns --output test/fixtures/tables/inconsistent-columns.invalid.csv
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Default values
const DEFAULT_ROWS = 10
const DEFAULT_COLUMNS = 5
const DEFAULT_DATA_TYPES = ['string', 'number', 'string']

type TableType = 'csv' | 'tsv' | 'txt' | 'invalid'
type DataType = 'string' | 'number' | 'integer' | 'float' | 'boolean' | 'date' | 'mixed'
type ErrorType =
  | 'inconsistent-columns'
  | 'no-delimiter'
  | 'empty'
  | 'starts-empty-lines'
  | 'malformed-quotes'

interface GenerateTableOptions {
  type: 'csv' | 'tsv' | 'txt'
  rowCount: number
  columnCount: number
  withHeaders: boolean
  delimiter?: string
  dataTypes: DataType[]
  quotedValues: boolean
  decimalDelimiter: string
  edgeList: boolean
  nodeAttributes: boolean
  edgeAttributes: boolean
}

/**
 * Generates a random string value
 */
function generateStringValue(index: number, columnIndex: number): string {
  const strings = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
    'Ivy',
    'Jack',
    'New York',
    'London',
    'Paris',
    'Tokyo',
    'Berlin',
    'Sydney',
    'Toronto',
    'Mumbai',
    'São Paulo',
    'Cairo',
  ]
  return strings[(index * 10 + columnIndex) % strings.length]
}

/**
 * Generates a random number value
 */
function generateNumberValue(index: number, columnIndex: number): number {
  return Math.floor(Math.random() * 100) + 1
}

/**
 * Generates a random float value
 */
function generateFloatValue(index: number, columnIndex: number): number {
  return Math.round((Math.random() * 100 + 1) * 100) / 100
}

/**
 * Generates a random integer value
 */
function generateIntegerValue(index: number, columnIndex: number): number {
  return Math.floor(Math.random() * 1000) + 1
}

/**
 * Generates a random boolean value
 */
function generateBooleanValue(index: number): string {
  return Math.random() < 0.5 ? 'true' : 'false'
}

/**
 * Generates a random date value
 */
function generateDateValue(index: number): string {
  const year = 2020 + (index % 5)
  const month = String((index % 12) + 1).padStart(2, '0')
  const day = String((index % 28) + 1).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Generates a value based on data type
 */
function generateValue(
  dataType: DataType,
  rowIndex: number,
  columnIndex: number,
  decimalDelimiter: string,
): string {
  let value: string | number

  switch (dataType) {
    case 'string':
      value = generateStringValue(rowIndex, columnIndex)
      break
    case 'number':
    case 'float':
      value = generateFloatValue(rowIndex, columnIndex)
      break
    case 'integer':
      value = generateIntegerValue(rowIndex, columnIndex)
      break
    case 'boolean':
      value = generateBooleanValue(rowIndex)
      break
    case 'date':
      value = generateDateValue(rowIndex)
      break
    case 'mixed':
      const types: DataType[] = ['string', 'number', 'boolean', 'date']
      const randomType = types[Math.floor(Math.random() * types.length)]
      return generateValue(randomType, rowIndex, columnIndex, decimalDelimiter)
    default:
      value = generateStringValue(rowIndex, columnIndex)
  }

  // Apply decimal delimiter for float/number types
  if (
    (dataType === 'number' || dataType === 'float') &&
    decimalDelimiter !== '.'
  ) {
    return String(value).replace('.', decimalDelimiter)
  }

  return String(value)
}

/**
 * Escapes CSV value (handles quotes and commas)
 */
function escapeCSVValue(value: string, quoted: boolean): string {
  if (quoted || value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generates a valid table file
 */
function generateValidTable(options: GenerateTableOptions): string {
  const {
    type,
    rowCount,
    columnCount,
    withHeaders,
    delimiter: customDelimiter,
    dataTypes,
    quotedValues,
    decimalDelimiter,
    edgeList,
    nodeAttributes,
    edgeAttributes,
  } = options

  // Determine delimiter
  let delimiter = customDelimiter
  if (!delimiter) {
    switch (type) {
      case 'csv':
        delimiter = ','
        break
      case 'tsv':
        delimiter = '\t'
        break
      case 'txt':
        delimiter = ' '
        break
    }
  }

  const lines: string[] = []

  // Generate headers
  if (withHeaders) {
    if (edgeList) {
      lines.push(`source${delimiter}target`)
    } else if (nodeAttributes) {
      const headers = ['node_id', 'type', 'score', 'active']
      lines.push(headers.join(delimiter))
    } else if (edgeAttributes) {
      const headers = ['edge_id', 'interaction', 'weight', 'confidence']
      lines.push(headers.join(delimiter))
    } else {
      const headers: string[] = []
      for (let i = 0; i < columnCount; i++) {
        headers.push(`column${i + 1}`)
      }
      lines.push(headers.join(delimiter))
    }
  }

  // Generate data rows
  const actualColumnCount = edgeList
    ? 2
    : nodeAttributes || edgeAttributes
      ? 4
      : columnCount

  for (let i = 0; i < rowCount; i++) {
    const row: string[] = []

    if (edgeList) {
      row.push(`node${i + 1}`)
      row.push(`node${((i + 1) % rowCount) + 1}`)
    } else if (nodeAttributes) {
      row.push(`n${i + 1}`)
      row.push(i % 2 === 0 ? 'protein' : 'gene')
      row.push(String(generateFloatValue(i, 0)))
      row.push(generateBooleanValue(i))
    } else if (edgeAttributes) {
      row.push(`e${i + 1}`)
      const interactions = ['interacts', 'binds', 'regulates', 'activates']
      row.push(interactions[i % interactions.length])
      row.push(String(generateFloatValue(i, 0)))
      const confidences = ['high', 'medium', 'low']
      row.push(confidences[i % confidences.length])
    } else {
      for (let j = 0; j < columnCount; j++) {
        const dataType = dataTypes[j % dataTypes.length]
        let value = generateValue(dataType, i, j, decimalDelimiter)

        // Apply quoting if needed
        if (type === 'csv' && quotedValues) {
          value = escapeCSVValue(value, true)
        } else if (type === 'csv' && (value.includes(',') || value.includes('"'))) {
          value = escapeCSVValue(value, false)
        }

        row.push(value)
      }
    }

    lines.push(row.join(delimiter))
  }

  return lines.join('\n')
}

/**
 * Generates an invalid table file
 */
function generateInvalidTable(errorType: ErrorType): string {
  switch (errorType) {
    case 'empty':
      return ''

    case 'no-delimiter':
      return `This is just text without any delimiters\nAnother line of text\nMore text here`

    case 'inconsistent-columns':
      return `name,age,city\nAlice,25,New York,extra\nBob,30\nCharlie,22,Paris,score,active`

    case 'starts-empty-lines':
      return `\n\nname,age,city\nAlice,25,New York\nBob,30,London`

    case 'malformed-quotes':
      return `name,description\nAlice,"Unclosed quote\nBob,"Properly closed",value`

    default:
      throw new Error(`Unknown error type: ${errorType}`)
  }
}

/**
 * Parses command line arguments
 */
function parseArgs(): {
  type: TableType
  rows?: number
  columns?: number
  withHeaders?: boolean
  delimiter?: string
  dataTypes?: DataType[]
  quotedValues?: boolean
  decimalDelimiter?: string
  edgeList?: boolean
  nodeAttributes?: boolean
  edgeAttributes?: boolean
  error?: ErrorType
  output: string
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

      case '--rows':
      case '-r':
        if (nextArg) {
          result.rows = parseInt(nextArg, 10)
          i++
        }
        break

      case '--columns':
      case '-c':
        if (nextArg) {
          result.columns = parseInt(nextArg, 10)
          i++
        }
        break

      case '--with-headers':
        result.withHeaders = true
        break

      case '--no-headers':
        result.withHeaders = false
        break

      case '--delimiter':
        if (nextArg) {
          result.delimiter = nextArg === '\\t' ? '\t' : nextArg
          i++
        }
        break

      case '--data-types':
        if (nextArg) {
          result.dataTypes = nextArg
            .split(',')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0) as DataType[]
          i++
        }
        break

      case '--quoted-values':
        result.quotedValues = true
        break

      case '--decimal-delimiter':
        if (nextArg) {
          result.decimalDelimiter = nextArg
          i++
        }
        break

      case '--edge-list':
        result.edgeList = true
        break

      case '--node-attributes':
        result.nodeAttributes = true
        break

      case '--edge-attributes':
        result.edgeAttributes = true
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

    let tableContent: string

    if (type === 'invalid') {
      if (!args.error) {
        throw new Error('--error is required for invalid type')
      }
      tableContent = generateInvalidTable(args.error)
    } else {
      const rowCount = args.rows || DEFAULT_ROWS
      const columnCount = args.columns || DEFAULT_COLUMNS
      const withHeaders =
        args.withHeaders !== undefined ? args.withHeaders : true
      const dataTypes = args.dataTypes || DEFAULT_DATA_TYPES
      const quotedValues = args.quotedValues || false
      const decimalDelimiter = args.decimalDelimiter || '.'

      tableContent = generateValidTable({
        type,
        rowCount,
        columnCount,
        withHeaders,
        delimiter: args.delimiter,
        dataTypes,
        quotedValues,
        decimalDelimiter,
        edgeList: args.edgeList || false,
        nodeAttributes: args.nodeAttributes || false,
        edgeAttributes: args.edgeAttributes || false,
      })
    }

    // Ensure output directory exists
    const outputDir = dirname(output)
    mkdirSync(outputDir, { recursive: true })

    // Write table content to file
    writeFileSync(output, tableContent, 'utf-8')

    console.log(`✓ Generated table file: ${output}`)
    console.log(`  Type: ${type}`)
    if (type !== 'invalid') {
      console.log(`  Rows: ${args.rows || DEFAULT_ROWS}`)
      console.log(`  Columns: ${args.columns || DEFAULT_COLUMNS}`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

