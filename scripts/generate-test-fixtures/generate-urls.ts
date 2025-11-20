#!/usr/bin/env ts-node
/**
 * Script to generate URL test fixtures for Cytoscape Web routing and state management testing.
 *
 * Usage:
 *   ts-node scripts/generate-test-fixtures/generate-urls.ts --type network-id --network-id abc-123 --workspace-id ws-456 --output test/fixtures/urls/network-id-valid.txt
 *   ts-node scripts/generate-test-fixtures/generate-urls.ts --type import --import-url https://example.com/network.cx2 --output test/fixtures/urls/import-parameter-valid.txt
 *   ts-node scripts/generate-test-fixtures/generate-urls.ts --type query --selected-nodes "n1 n2 n3" --output test/fixtures/urls/state-selected-nodes.txt
 *   ts-node scripts/generate-test-fixtures/generate-urls.ts --type invalid --error invalid-workspace-id --output test/fixtures/urls/invalid-workspace-id.txt
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Default values
const DEFAULT_WORKSPACE_ID = 'workspace-123'
const DEFAULT_NETWORK_ID = 'network-456'
const DEFAULT_BASE_URL = ''

// URL parameter names (matching AppShell implementation)
// Note: selectedNodes/selectedEdges are lowercase in the actual code
const PARAM_SELECTED_NODES = 'selectednodes'
const PARAM_SELECTED_EDGES = 'selectededges'
const PARAM_FILTER_FOR = 'filterFor'
const PARAM_FILTER_BY = 'filterBy'
const PARAM_FILTER_RANGE = 'filterRange'
const PARAM_LEFT_PANEL = 'left'
const PARAM_RIGHT_PANEL = 'right'
const PARAM_BOTTOM_PANEL = 'bottom'
const PARAM_ACTIVE_NETWORK_VIEW = 'activeNetworkView'
const PARAM_ACTIVE_TABLE_BROWSER_TAB = 'activeTableBrowserTab'
const PARAM_IMPORT = 'import'

interface GenerateNetworkIdURLOptions {
  workspaceId: string
  networkId: string
  baseUrl?: string
}

interface GenerateImportURLOptions {
  workspaceId?: string
  importUrl: string | string[]
  baseUrl?: string
}

interface GenerateQueryParamsURLOptions {
  workspaceId: string
  networkId: string
  selectedNodes?: string[]
  selectedEdges?: string[]
  filterFor?: string
  filterBy?: string
  filterRange?: string
  leftPanel?: string
  rightPanel?: string
  bottomPanel?: string
  activeNetworkView?: string
  activeTableBrowserTab?: number
  baseUrl?: string
}

type URLType = 'network-id' | 'import' | 'query' | 'combined' | 'invalid'
type ErrorType =
  | 'invalid-workspace-id'
  | 'invalid-network-id'
  | 'invalid-query-params'
  | 'invalid-import-url'

/**
 * Generates a URL with network ID in the path
 */
function generateNetworkIdURL(options: GenerateNetworkIdURLOptions): string {
  const { workspaceId, networkId, baseUrl = DEFAULT_BASE_URL } = options
  return `${baseUrl}/${workspaceId}/networks/${networkId}`
}

/**
 * Generates a URL with import query parameter(s)
 */
function generateImportURL(options: GenerateImportURLOptions): string {
  const { workspaceId, importUrl, baseUrl = DEFAULT_BASE_URL } = options

  const importUrls = Array.isArray(importUrl) ? importUrl : [importUrl]
  const params = new URLSearchParams()

  // Add multiple import parameters
  importUrls.forEach((url) => {
    params.append(PARAM_IMPORT, url)
  })

  const queryString = params.toString()

  if (workspaceId) {
    return `${baseUrl}/${workspaceId}?${queryString}`
  }

  return `${baseUrl}/?${queryString}`
}

/**
 * Generates a URL with query parameters for state management
 */
function generateQueryParamsURL(
  options: GenerateQueryParamsURLOptions,
): string {
  const {
    workspaceId,
    networkId,
    selectedNodes,
    selectedEdges,
    filterFor,
    filterBy,
    filterRange,
    leftPanel,
    rightPanel,
    bottomPanel,
    activeNetworkView,
    activeTableBrowserTab,
    baseUrl = DEFAULT_BASE_URL,
  } = options

  const params = new URLSearchParams()

  if (selectedNodes && selectedNodes.length > 0) {
    params.set(PARAM_SELECTED_NODES, selectedNodes.join(' '))
  }

  if (selectedEdges && selectedEdges.length > 0) {
    params.set(PARAM_SELECTED_EDGES, selectedEdges.join(' '))
  }

  if (filterFor) {
    params.set(PARAM_FILTER_FOR, filterFor)
  }

  if (filterBy) {
    params.set(PARAM_FILTER_BY, filterBy)
  }

  if (filterRange) {
    params.set(PARAM_FILTER_RANGE, filterRange)
  }

  if (leftPanel) {
    params.set(PARAM_LEFT_PANEL, leftPanel)
  }

  if (rightPanel) {
    params.set(PARAM_RIGHT_PANEL, rightPanel)
  }

  if (bottomPanel) {
    params.set(PARAM_BOTTOM_PANEL, bottomPanel)
  }

  if (activeNetworkView) {
    params.set(PARAM_ACTIVE_NETWORK_VIEW, activeNetworkView)
  }

  if (activeTableBrowserTab !== undefined) {
    params.set(PARAM_ACTIVE_TABLE_BROWSER_TAB, activeTableBrowserTab.toString())
  }

  const queryString = params.toString()
  const path = `/${workspaceId}/networks/${networkId}`

  return queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`
}

/**
 * Generates an invalid URL based on error type
 */
function generateInvalidURL(
  errorType: ErrorType,
  baseUrl: string = DEFAULT_BASE_URL,
): string {
  switch (errorType) {
    case 'invalid-workspace-id':
      // Malformed workspace ID (contains invalid characters)
      return `${baseUrl}/invalid-workspace-123!/networks/network-456`

    case 'invalid-network-id':
      // Not a valid UUID format
      return `${baseUrl}/workspace-123/networks/not-a-valid-uuid`

    case 'invalid-query-params':
      // Malformed query parameters (missing value, invalid format)
      return `${baseUrl}/workspace-123/networks/network-456?invalid=param&format&missingValue=`

    case 'invalid-import-url':
      // Invalid import URL format (not a valid URL)
      return `${baseUrl}/?import=not-a-valid-url`

    default:
      throw new Error(`Unknown error type: ${errorType}`)
  }
}

/**
 * Parses command line arguments
 */
function parseArgs(): {
  type: URLType
  workspaceId?: string
  networkId?: string
  importUrl?: string
  multipleImports?: string[]
  selectedNodes?: string[]
  selectedEdges?: string[]
  filterFor?: string
  filterBy?: string
  filterRange?: string
  leftPanel?: string
  rightPanel?: string
  bottomPanel?: string
  activeNetworkView?: string
  activeTableBrowserTab?: number
  error?: ErrorType
  output: string
  baseUrl?: string
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

      case '--workspace-id':
      case '-w':
        if (nextArg) {
          result.workspaceId = nextArg
          i++
        }
        break

      case '--network-id':
      case '-n':
        if (nextArg) {
          result.networkId = nextArg
          i++
        }
        break

      case '--import-url':
        if (nextArg) {
          result.importUrl = nextArg
          i++
        }
        break

      case '--multiple-imports':
        if (nextArg) {
          result.multipleImports = nextArg
            .split(',')
            .map((url: string) => url.trim())
          i++
        }
        break

      case '--selected-nodes':
        if (nextArg) {
          result.selectedNodes = nextArg
            .split(' ')
            .filter((n: string) => n.length > 0)
          i++
        }
        break

      case '--selected-edges':
        if (nextArg) {
          result.selectedEdges = nextArg
            .split(' ')
            .filter((e: string) => e.length > 0)
          i++
        }
        break

      case '--filter-for':
        if (nextArg) {
          result.filterFor = nextArg
          i++
        }
        break

      case '--filter-by':
        if (nextArg) {
          result.filterBy = nextArg
          i++
        }
        break

      case '--filter-range':
        if (nextArg) {
          result.filterRange = nextArg
          i++
        }
        break

      case '--left-panel':
        if (nextArg) {
          result.leftPanel = nextArg
          i++
        }
        break

      case '--right-panel':
        if (nextArg) {
          result.rightPanel = nextArg
          i++
        }
        break

      case '--bottom-panel':
        if (nextArg) {
          result.bottomPanel = nextArg
          i++
        }
        break

      case '--active-network-view':
        if (nextArg) {
          result.activeNetworkView = nextArg
          i++
        }
        break

      case '--active-table-browser-tab':
        if (nextArg) {
          result.activeTableBrowserTab = parseInt(nextArg, 10)
          i++
        }
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

      case '--base-url':
        if (nextArg) {
          result.baseUrl = nextArg
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
    const { type, output, baseUrl } = args

    let url: string

    switch (type) {
      case 'network-id': {
        const workspaceId = args.workspaceId || DEFAULT_WORKSPACE_ID
        const networkId = args.networkId || DEFAULT_NETWORK_ID
        url = generateNetworkIdURL({ workspaceId, networkId, baseUrl })
        break
      }

      case 'import': {
        const importUrl =
          args.multipleImports ||
          (args.importUrl ? [args.importUrl] : undefined)
        if (!importUrl || importUrl.length === 0) {
          throw new Error(
            '--import-url or --multiple-imports is required for import type',
          )
        }
        url = generateImportURL({
          workspaceId: args.workspaceId,
          importUrl: importUrl.length === 1 ? importUrl[0] : importUrl,
          baseUrl,
        })
        break
      }

      case 'query': {
        const workspaceId = args.workspaceId || DEFAULT_WORKSPACE_ID
        const networkId = args.networkId || DEFAULT_NETWORK_ID
        url = generateQueryParamsURL({
          workspaceId,
          networkId,
          selectedNodes: args.selectedNodes,
          selectedEdges: args.selectedEdges,
          filterFor: args.filterFor,
          filterBy: args.filterBy,
          filterRange: args.filterRange,
          leftPanel: args.leftPanel,
          rightPanel: args.rightPanel,
          bottomPanel: args.bottomPanel,
          activeNetworkView: args.activeNetworkView,
          activeTableBrowserTab: args.activeTableBrowserTab,
          baseUrl,
        })
        break
      }

      case 'combined': {
        const workspaceId = args.workspaceId || DEFAULT_WORKSPACE_ID
        const networkId = args.networkId || DEFAULT_NETWORK_ID

        // Build query params including import if provided
        const params = new URLSearchParams()

        // Add import if provided
        const importUrl =
          args.multipleImports ||
          (args.importUrl ? [args.importUrl] : undefined)
        if (importUrl) {
          importUrl.forEach((url) => {
            params.append(PARAM_IMPORT, url)
          })
        }

        // Add other query params
        if (args.selectedNodes && args.selectedNodes.length > 0) {
          params.set(PARAM_SELECTED_NODES, args.selectedNodes.join(' '))
        }
        if (args.selectedEdges && args.selectedEdges.length > 0) {
          params.set(PARAM_SELECTED_EDGES, args.selectedEdges.join(' '))
        }
        if (args.filterFor) {
          params.set(PARAM_FILTER_FOR, args.filterFor)
        }
        if (args.filterBy) {
          params.set(PARAM_FILTER_BY, args.filterBy)
        }
        if (args.filterRange) {
          params.set(PARAM_FILTER_RANGE, args.filterRange)
        }
        if (args.leftPanel) {
          params.set(PARAM_LEFT_PANEL, args.leftPanel)
        }
        if (args.rightPanel) {
          params.set(PARAM_RIGHT_PANEL, args.rightPanel)
        }
        if (args.bottomPanel) {
          params.set(PARAM_BOTTOM_PANEL, args.bottomPanel)
        }
        if (args.activeNetworkView) {
          params.set(PARAM_ACTIVE_NETWORK_VIEW, args.activeNetworkView)
        }
        if (args.activeTableBrowserTab !== undefined) {
          params.set(
            PARAM_ACTIVE_TABLE_BROWSER_TAB,
            args.activeTableBrowserTab.toString(),
          )
        }

        const queryString = params.toString()
        const path = `/${workspaceId}/networks/${networkId}`
        url = queryString
          ? `${baseUrl || ''}${path}?${queryString}`
          : `${baseUrl || ''}${path}`
        break
      }

      case 'invalid': {
        if (!args.error) {
          throw new Error('--error is required for invalid type')
        }
        url = generateInvalidURL(args.error, baseUrl)
        break
      }

      default:
        throw new Error(`Unknown type: ${type}`)
    }

    // Ensure output directory exists
    const outputDir = dirname(output)
    mkdirSync(outputDir, { recursive: true })

    // Write URL to file (one URL per line)
    writeFileSync(output, url + '\n', 'utf-8')

    console.log(`✓ Generated URL: ${url}`)
    console.log(`✓ Written to: ${output}`)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
