#!/usr/bin/env ts-node
/**
 * Script to generate all URL test fixtures as specified in TEST_RESOURCES_COMPREHENSIVE.md
 *
 * This script uses generate-urls.ts to generate all required URL test cases for:
 * - Network ID URLs (valid, import-needed, invalid)
 * - Import parameter URLs (valid, multiple, invalid URL, invalid CX)
 * - Query parameter URLs (selections, filters, UI state, combined)
 * - Invalid URLs (workspace ID, network ID, query params)
 *
 * Usage:
 *   npx tsx scripts/generate-test-fixtures/generate-all-urls.ts
 *   npx tsx scripts/generate-test-fixtures/generate-all-urls.ts --base-url http://localhost:3000
 */

import { spawn } from 'child_process'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const OUTPUT_DIR = join(__dirname, '../../test/fixtures/urls')
const DEFAULT_BASE_URL = 'http://localhost:5500'

// Test data constants
const WORKSPACE_ID = 'workspace-123'
const VALID_NETWORK_ID = 'a9763574-c72f-11ed-a79c-005056ae23aa'
const DEFAULT_NETWORK_ID = 'net-456'
const NEW_NETWORK_UUID = 'new-network-uuid'
const INVALID_UUID = 'invalid-uuid'

interface URLGenerationTask {
  name: string
  type: string
  args: string[]
  output: string
  category: string
  description: string
  expectedBehavior: string
}

interface TestCase {
  testCase: string
  category: string
  url: string
  description: string
  expectedBehavior: string
}

/**
 * Runs generate-urls.ts with the given arguments
 */
async function generateURL(
  type: string,
  args: string[],
  output: string,
  baseUrl: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'generate-urls.ts')
    // Use shell: false to preserve spaces in arguments
    const child = spawn(
      'npx',
      [
        'tsx',
        scriptPath,
        '--type',
        type,
        ...args,
        '--base-url',
        baseUrl,
        '--output',
        output,
      ],
      {
        stdio: 'inherit',
        shell: false,
      },
    )

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`generate-urls.ts exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Parses command line arguments for base URL
 */
function parseArgs(): { baseUrl: string } {
  const args = process.argv.slice(2)
  let baseUrl = DEFAULT_BASE_URL

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) {
      baseUrl = args[i + 1]
      break
    }
  }

  return { baseUrl }
}

/**
 * Generates all URL test fixtures
 */
async function generateAllURLs(baseUrl: string): Promise<void> {
  const tasks: URLGenerationTask[] = [
    // 6.1 URLs with Network IDs
    {
      name: 'Network ID - Valid',
      type: 'network-id',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        VALID_NETWORK_ID,
      ],
      output: join(OUTPUT_DIR, 'network-id-valid.txt'),
      category: 'Network IDs',
      description: 'Direct network access with valid network ID',
      expectedBehavior: 'Network loads successfully from URL',
    },
    {
      name: 'Network ID - Import Needed',
      type: 'network-id',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        NEW_NETWORK_UUID,
      ],
      output: join(OUTPUT_DIR, 'network-id-import.txt'),
      category: 'Network IDs',
      description: 'Network ID not in workspace - needs import',
      expectedBehavior: 'Network is imported from NDEx via URL',
    },
    {
      name: 'Network ID - Invalid',
      type: 'network-id',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        INVALID_UUID,
      ],
      output: join(OUTPUT_DIR, 'network-id-invalid.txt'),
      category: 'Network IDs',
      description: 'Non-existent network with invalid UUID',
      expectedBehavior: 'Error handling for invalid network IDs',
    },

    // 6.2 URLs with Import Parameters
    {
      name: 'Import Parameter - Valid',
      type: 'import',
      args: ['--import-url', 'https://example.com/network.cx2'],
      output: join(OUTPUT_DIR, 'import-parameter-valid.txt'),
      category: 'Import Parameters',
      description: 'Import network from external URL',
      expectedBehavior: 'Network imports successfully from external URL',
    },
    {
      name: 'Import Parameter - Multiple',
      type: 'import',
      args: [
        '--multiple-imports',
        'https://example.com/net1.cx2,https://example.com/net2.cx2',
      ],
      output: join(OUTPUT_DIR, 'import-parameter-multiple.txt'),
      category: 'Import Parameters',
      description: 'Multiple network imports from URLs',
      expectedBehavior: 'Multiple networks import successfully',
    },
    {
      name: 'Import Parameter - Invalid URL',
      type: 'invalid',
      args: ['--error', 'invalid-import-url'],
      output: join(OUTPUT_DIR, 'import-parameter-invalid-url.txt'),
      category: 'Import Parameters',
      description: 'Invalid import URL format',
      expectedBehavior: 'Error handling for invalid import URLs',
    },
    {
      name: 'Import Parameter - Invalid CX',
      type: 'import',
      args: ['--import-url', 'https://example.com/invalid-cx.cx2'],
      output: join(OUTPUT_DIR, 'import-parameter-invalid-cx.txt'),
      category: 'Import Parameters',
      description: 'Valid URL but invalid CX format',
      expectedBehavior: 'Validation error handling for invalid CX',
    },

    // 6.3 URLs with Query Parameters (State)
    // Selection State
    {
      name: 'State - Selected Nodes',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--selected-nodes',
        'node1 node2 node3',
      ],
      output: join(OUTPUT_DIR, 'state-selected-nodes.txt'),
      category: 'State - Selection',
      description: 'Pre-select nodes from URL',
      expectedBehavior: 'Node selection is restored from URL',
    },
    {
      name: 'State - Selected Edges',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--selected-edges',
        'edge1 edge2',
      ],
      output: join(OUTPUT_DIR, 'state-selected-edges.txt'),
      category: 'State - Selection',
      description: 'Pre-select edges from URL',
      expectedBehavior: 'Edge selection is restored from URL',
    },
    {
      name: 'State - Selected Both',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--selected-nodes',
        'n1 n2',
        '--selected-edges',
        'e1',
      ],
      output: join(OUTPUT_DIR, 'state-selected-both.txt'),
      category: 'State - Selection',
      description: 'Pre-select both nodes and edges',
      expectedBehavior: 'Combined selection state is restored',
    },

    // Filter State
    {
      name: 'State - Filter',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--filter-for',
        'node',
        '--filter-by',
        'type',
        '--filter-range',
        'protein',
      ],
      output: join(OUTPUT_DIR, 'state-filter.txt'),
      category: 'State - Filter',
      description: 'Pre-apply filters from URL',
      expectedBehavior: 'Filter state is restored from URL',
    },

    // UI State
    {
      name: 'State - Panels',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--left-panel',
        'open',
        '--right-panel',
        'closed',
        '--bottom-panel',
        'open',
      ],
      output: join(OUTPUT_DIR, 'state-panels.txt'),
      category: 'State - UI',
      description: 'Pre-open/close panels from URL',
      expectedBehavior: 'Panel states are restored from URL',
    },
    {
      name: 'State - Active Network View',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--active-network-view',
        'view-1',
      ],
      output: join(OUTPUT_DIR, 'state-active-view.txt'),
      category: 'State - UI',
      description: 'Pre-select network view from URL',
      expectedBehavior: 'Network view selection is restored',
    },
    {
      name: 'State - Table Browser Tab',
      type: 'query',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--active-table-browser-tab',
        '1',
      ],
      output: join(OUTPUT_DIR, 'state-table-tab.txt'),
      category: 'State - UI',
      description: 'Pre-select table browser tab from URL',
      expectedBehavior: 'Table browser tab selection is restored',
    },

    // Combined State
    {
      name: 'State - Complete',
      type: 'combined',
      args: [
        '--workspace-id',
        WORKSPACE_ID,
        '--network-id',
        DEFAULT_NETWORK_ID,
        '--selected-nodes',
        'n1 n2',
        '--selected-edges',
        'e1',
        '--filter-for',
        'node',
        '--filter-by',
        'type',
        '--left-panel',
        'open',
        '--right-panel',
        'closed',
        '--active-network-view',
        'view-1',
      ],
      output: join(OUTPUT_DIR, 'state-complete.txt'),
      category: 'State - Combined',
      description: 'All state parameters combined',
      expectedBehavior: 'Complete state restoration from URL',
    },

    // 6.4 Invalid URLs
    {
      name: 'Invalid - Workspace ID',
      type: 'invalid',
      args: ['--error', 'invalid-workspace-id'],
      output: join(OUTPUT_DIR, 'invalid-workspace-id.txt'),
      category: 'Invalid URLs',
      description: 'Malformed workspace ID format',
      expectedBehavior: 'Workspace ID validation error',
    },
    {
      name: 'Invalid - Network ID',
      type: 'invalid',
      args: ['--error', 'invalid-network-id'],
      output: join(OUTPUT_DIR, 'invalid-network-id.txt'),
      category: 'Invalid URLs',
      description: 'Malformed network ID format',
      expectedBehavior: 'Network ID validation error',
    },
    {
      name: 'Invalid - Query Params',
      type: 'invalid',
      args: ['--error', 'invalid-query-params'],
      output: join(OUTPUT_DIR, 'invalid-query-params.txt'),
      category: 'Invalid URLs',
      description: 'Malformed query parameter format',
      expectedBehavior: 'Query parameter parsing error',
    },
  ]

  console.log(`Generating ${tasks.length} URL test fixtures...`)
  console.log(`Base URL: ${baseUrl}\n`)

  for (const task of tasks) {
    try {
      console.log(`Generating: ${task.name}`)
      await generateURL(task.type, task.args, task.output, baseUrl)
      console.log(`✓ ${task.name}\n`)
    } catch (error) {
      console.error(`✗ Failed to generate ${task.name}:`, error)
      throw error
    }
  }

  console.log(`\n✓ Successfully generated ${tasks.length} URL test fixtures`)
  console.log(`Output directory: ${OUTPUT_DIR}`)
  console.log(`Base URL: ${baseUrl}`)

  // Generate HTML and CSV files
  console.log('\nGenerating HTML and CSV test files...')
  await generateHTMLAndCSV(tasks, baseUrl)
  console.log('✓ HTML and CSV files generated')
}

/**
 * Reads URL from a file
 */
function readURLFromFile(filePath: string): string {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return content.trim()
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
    return ''
  }
}

/**
 * Generates HTML test page
 */
function generateHTML(tasks: URLGenerationTask[], baseUrl: string): string {
  const testCases: TestCase[] = tasks.map((task) => ({
    testCase: task.name,
    category: task.category,
    url: readURLFromFile(task.output),
    description: task.description,
    expectedBehavior: task.expectedBehavior,
  }))

  // Group by category
  const categories = new Map<string, TestCase[]>()
  testCases.forEach((testCase) => {
    if (!categories.has(testCase.category)) {
      categories.set(testCase.category, [])
    }
    categories.get(testCase.category)!.push(testCase)
  })

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URL Test Fixtures - Cytoscape Web</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .info {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
      border-left: 4px solid #3498db;
    }
    .category {
      margin-bottom: 40px;
    }
    .category-title {
      font-size: 1.5em;
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
    }
    .test-case {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
      transition: box-shadow 0.2s;
    }
    .test-case:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .test-case-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    .test-case-name {
      font-weight: 600;
      font-size: 1.1em;
      color: #2c3e50;
      margin-right: 10px;
    }
    .test-link {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 4px;
      font-size: 0.9em;
      transition: background 0.2s;
      margin-left: auto;
    }
    .test-link:hover {
      background: #2980b9;
    }
    .test-link:target {
      background: #27ae60;
    }
    .description {
      color: #555;
      margin-bottom: 8px;
    }
    .expected {
      color: #7f8c8d;
      font-size: 0.9em;
      font-style: italic;
    }
    .url-display {
      background: #f8f9fa;
      padding: 8px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      color: #555;
      word-break: break-all;
      margin-top: 8px;
    }
    .stats {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
    }
    .stat {
      flex: 1;
    }
    .stat-label {
      font-size: 0.9em;
      color: #7f8c8d;
    }
    .stat-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>URL Test Fixtures - Cytoscape Web</h1>
    <div class="info">
      <strong>Base URL:</strong> ${baseUrl}<br>
      <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
      <strong>Total Test Cases:</strong> ${testCases.length}
    </div>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Total Test Cases</div>
        <div class="stat-value">${testCases.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Categories</div>
        <div class="stat-value">${categories.size}</div>
      </div>
    </div>
`

  // Generate category sections
  categories.forEach((cases, categoryName) => {
    html += `    <div class="category">
      <h2 class="category-title">${categoryName}</h2>
`
    cases.forEach((testCase) => {
      html += `      <div class="test-case">
        <div class="test-case-header">
          <span class="test-case-name">${testCase.testCase}</span>
          <a href="${testCase.url}" target="_blank" class="test-link">Test →</a>
        </div>
        <div class="description">${testCase.description}</div>
        <div class="expected">Expected: ${testCase.expectedBehavior}</div>
        <div class="url-display">${testCase.url}</div>
      </div>
`
    })
    html += `    </div>
`
  })

  html += `  </div>
</body>
</html>`

  return html
}

/**
 * Generates CSV file
 */
function generateCSV(tasks: URLGenerationTask[]): string {
  const testCases: TestCase[] = tasks.map((task) => ({
    testCase: task.name,
    category: task.category,
    url: readURLFromFile(task.output),
    description: task.description,
    expectedBehavior: task.expectedBehavior,
  }))

  // CSV header
  let csv = 'Test Case,Category,URL,Description,Expected Behavior\n'

  // Escape CSV values
  function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Add rows
  testCases.forEach((testCase) => {
    csv += `${escapeCSV(testCase.testCase)},${escapeCSV(testCase.category)},${escapeCSV(testCase.url)},${escapeCSV(testCase.description)},${escapeCSV(testCase.expectedBehavior)}\n`
  })

  return csv
}

/**
 * Generates HTML and CSV files
 */
async function generateHTMLAndCSV(
  tasks: URLGenerationTask[],
  baseUrl: string,
): Promise<void> {
  const html = generateHTML(tasks, baseUrl)
  const csv = generateCSV(tasks)

  const htmlPath = join(OUTPUT_DIR, 'test-urls.html')
  const csvPath = join(OUTPUT_DIR, 'test-urls.csv')

  writeFileSync(htmlPath, html, 'utf-8')
  writeFileSync(csvPath, csv, 'utf-8')

  console.log(`  ✓ Generated: ${htmlPath}`)
  console.log(`  ✓ Generated: ${csvPath}`)
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const { baseUrl } = parseArgs()
    await generateAllURLs(baseUrl)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

