/**
 * @fileoverview Application State Export Utility
 *
 * This module provides functionality to export the complete application state,
 * including both IndexedDB data and in-memory Zustand store states.
 * This is useful for understanding the application state structure and
 * improving state/model design.
 *
 * @module db/snapshot/exportApplicationState
 */

import packageJson from '../../../../package.json'
import { logDb } from '../../../debug'
import { getDatabaseVersion } from '../index'
import { exportDatabaseSnapshot } from './index'
import type { DatabaseSnapshot } from './index'

/**
 * Application state structure combining database and store states.
 * This provides a high-level view of the application state.
 */
export interface ApplicationState {
  metadata: {
    version: number // Database schema version
    exportDate: string // ISO timestamp
    exportVersion: string // App version (from package.json)
    buildId?: string // Build ID (git commit hash + commit date)
    buildDate?: string // Build timestamp (ISO string)
  }
  database: DatabaseSnapshot['data'] // IndexedDB state
  stores: {
    // Zustand store states
    workspace?: any
    network?: any
    networkSummary?: any
    table?: any
    visualStyle?: any
    viewModel?: any
    uiState?: any
    app?: any
    filter?: any
    layout?: any
    renderer?: any
    rendererFunction?: any
    opaqueAspect?: any
    undo?: any
    message?: any
    credential?: any
  }
  summary: {
    networkCount: number
    workspaceId: string
    currentNetworkId: string
    networkIds: string[]
    storeStatesCount: number
  }
}

/**
 * Helper function to convert Map to plain object for JSON serialization
 */
const mapToObject = (
  map: Map<any, any>,
  visited: WeakSet<WeakKey>,
): Record<string, any> => {
  const obj: Record<string, any> = {}
  for (const [key, value] of map.entries()) {
    obj[String(key)] = serializeStoreState(value, visited)
  }
  return obj
}

/**
 * Check if a value is a DOM element or other non-serializable object
 */
const isNonSerializable = (value: any): boolean => {
  // Check for DOM elements and browser APIs
  if (typeof value === 'object' && value !== null) {
    if (
      value instanceof Element ||
      value instanceof Node ||
      value instanceof Window ||
      value instanceof Document ||
      value instanceof HTMLElement ||
      value instanceof SVGElement
    ) {
      return true
    }
    // Check for functions
    if (typeof value === 'function') {
      return true
    }
    // Check for other browser-specific objects that can't be serialized
    if (
      value instanceof Event ||
      value instanceof EventTarget ||
      value instanceof AbortController ||
      value instanceof AbortSignal
    ) {
      return true
    }
  }
  return false
}

/**
 * Helper function to serialize store state, converting Maps to objects
 * and handling circular references and non-serializable values
 */
const serializeStoreState = (
  state: any,
  visited: WeakSet<WeakKey> = new WeakSet(),
): any => {
  if (state === null || state === undefined) {
    return state
  }

  // Handle primitive types
  if (typeof state !== 'object') {
    return state
  }

  // Check for non-serializable objects (DOM elements, functions, etc.)
  if (isNonSerializable(state)) {
    // Return a placeholder indicating the type
    if (state instanceof Element) {
      return `[DOM Element: ${state.tagName}]`
    }
    if (state instanceof Node) {
      return `[DOM Node: ${state.nodeName}]`
    }
    if (typeof state === 'function') {
      return `[Function: ${state.name || 'anonymous'}]`
    }
    return '[Non-serializable object]'
  }

  // Check for circular references (object already being serialized in current path)
  if (visited.has(state as WeakKey)) {
    return '[Circular Reference]'
  }

  // Mark as visited before serializing children
  visited.add(state as WeakKey)

  try {
    if (state instanceof Map) {
      return mapToObject(state, visited)
    }

    if (Array.isArray(state)) {
      return state.map((item) => serializeStoreState(item, visited))
    }

    if (typeof state === 'object') {
      const serialized: Record<string, any> = {}
      for (const [key, value] of Object.entries(state)) {
        try {
          serialized[key] = serializeStoreState(value, visited)
        } catch (error) {
          // If serialization fails for a property, skip it with error message
          serialized[key] = '[Serialization Error]'
        }
      }
      return serialized
    }

    return state
  } catch (error) {
    // If serialization fails entirely, return error placeholder
    return '[Serialization Error]'
  }
}

/**
 * Exports the complete application state including database and all store states.
 *
 * This function:
 * 1. Exports the IndexedDB database snapshot
 * 2. Collects all Zustand store states
 * 3. Combines them into a structured format
 * 4. Adds summary information for quick reference
 *
 * @returns Promise resolving to JSON string of the application state
 * @throws Error if export fails
 */
export const exportApplicationState = async (): Promise<string> => {
  try {
    logDb.info('[exportApplicationState] Starting application state export...')

    // Export database snapshot
    const dbSnapshotJson = await exportDatabaseSnapshot()
    const dbSnapshot: DatabaseSnapshot = JSON.parse(dbSnapshotJson)

    // Collect store states
    // We need to dynamically import stores to avoid circular dependencies
    // and ensure they're available at runtime
    const stores: ApplicationState['stores'] = {}

    try {
      // Dynamically import stores
      const { useWorkspaceStore } = await import(
        '../../hooks/stores/WorkspaceStore'
      )
      const { useNetworkStore } = await import(
        '../../hooks/stores/NetworkStore'
      )
      const { useNetworkSummaryStore } = await import(
        '../../hooks/stores/NetworkSummaryStore'
      )
      const { useTableStore } = await import('../../hooks/stores/TableStore')
      const { useVisualStyleStore } = await import(
        '../../hooks/stores/VisualStyleStore'
      )
      const { useViewModelStore } = await import(
        '../../hooks/stores/ViewModelStore'
      )
      const { useUiStateStore } = await import(
        '../../hooks/stores/UiStateStore'
      )
      const { useAppStore } = await import('../../hooks/stores/AppStore')
      const { useFilterStore } = await import('../../hooks/stores/FilterStore')
      const { useLayoutStore } = await import('../../hooks/stores/LayoutStore')
      const { useRendererStore } = await import(
        '../../hooks/stores/RendererStore'
      )
      const { useRendererFunctionStore } = await import(
        '../../hooks/stores/RendererFunctionStore'
      )
      const { useOpaqueAspectStore } = await import(
        '../../hooks/stores/OpaqueAspectStore'
      )
      const { useUndoStore } = await import('../../hooks/stores/UndoStore')
      const { useMessageStore } = await import(
        '../../hooks/stores/MessageStore'
      )
      const { useCredentialStore } = await import(
        '../../hooks/stores/CredentialStore'
      )

      // Get store states
      stores.workspace = serializeStoreState(useWorkspaceStore.getState())
      stores.network = serializeStoreState(useNetworkStore.getState())
      stores.networkSummary = serializeStoreState(
        useNetworkSummaryStore.getState(),
      )
      stores.table = serializeStoreState(useTableStore.getState())
      stores.visualStyle = serializeStoreState(useVisualStyleStore.getState())
      stores.viewModel = serializeStoreState(useViewModelStore.getState())
      stores.uiState = serializeStoreState(useUiStateStore.getState())
      stores.app = serializeStoreState(useAppStore.getState())
      stores.filter = serializeStoreState(useFilterStore.getState())
      stores.layout = serializeStoreState(useLayoutStore.getState())
      stores.renderer = serializeStoreState(useRendererStore.getState())
      stores.rendererFunction = serializeStoreState(
        useRendererFunctionStore.getState(),
      )
      stores.opaqueAspect = serializeStoreState(useOpaqueAspectStore.getState())
      stores.undo = serializeStoreState(useUndoStore.getState())
      stores.message = serializeStoreState(useMessageStore.getState())
      stores.credential = serializeStoreState(useCredentialStore.getState())
    } catch (storeError) {
      logDb.warn(
        '[exportApplicationState] Failed to export some store states:',
        storeError,
      )
      // Continue with partial export
    }

    // Extract summary information
    const workspace = stores.workspace?.workspace
    const networkIds = workspace?.networkIds || []
    const currentNetworkId = workspace?.currentNetworkId || ''
    const workspaceId = workspace?.id || ''

    // Count networks in database
    const networkCount =
      dbSnapshot.data.cyNetworks?.length ||
      Object.keys(stores.network?.networks || {}).length ||
      0

    // Build application state
    const appState: ApplicationState = {
      metadata: dbSnapshot.metadata,
      database: dbSnapshot.data,
      stores,
      summary: {
        networkCount,
        workspaceId,
        currentNetworkId,
        networkIds,
        storeStatesCount: Object.keys(stores).length,
      },
    }

    return JSON.stringify(appState, null, 2)
  } catch (e) {
    logDb.error('[exportApplicationState] error:', e)
    throw e
  }
}

/**
 * Exports the application state and triggers a browser download.
 *
 * @param filename - Optional filename (default: cyweb-app-state-VERSION-YYYY-MM-DD.json)
 * @throws Error if export or download fails
 */
export const exportApplicationStateToFile = async (
  filename?: string,
): Promise<void> => {
  try {
    const stateJson = await exportApplicationState()

    // Generate filename if not provided
    if (!filename) {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const appVersion = packageJson.version || '1.0.0'
      filename = `cyweb-app-state-${appVersion}-${date}.json`
    }

    // Create blob and download
    const blob = new Blob([stateJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logDb.info(
      '[exportApplicationStateToFile] Application state exported to:',
      filename,
    )
  } catch (e) {
    logDb.error('[exportApplicationStateToFile] error:', e)
    throw e
  }
}

/**
 * Manual application state export function for browser console.
 * Exposed on window.debug.exportAppState when debug mode is enabled.
 *
 * Usage in browser console:
 *   await window.debug.exportAppState()
 *
 * @param exportVersion - Optional app version string (defaults to package.json version)
 */
export const manualExportAppState = async (
  exportVersion?: string,
): Promise<void> => {
  try {
    console.log('🚀 Starting application state export...')

    const dbVersion = getDatabaseVersion()
    const appVersion = exportVersion || packageJson.version || '1.0.0'

    console.log(`📦 Database: cyweb-db`)
    console.log(`🔢 Database Version: ${dbVersion}`)
    console.log(`📱 App Version: ${appVersion}`)

    console.log('\n📊 Exporting application state...')

    // Export and get state JSON for stats
    const stateJson = await exportApplicationState()
    const state = JSON.parse(stateJson)

    // Generate filename
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const filename = `cyweb-app-state-${appVersion}-${date}.json`

    // Download the file
    const blob = new Blob([stateJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Calculate stats
    const stateSize = stateJson.length
    const stateSizeMB = (stateSize / (1024 * 1024)).toFixed(2)

    console.log('\n✅ Application state exported successfully!')
    console.log(`📁 Filename: ${filename}`)
    console.log(`💾 File size: ${stateSizeMB} MB`)
    console.log('\n📋 Application state structure:')
    console.log('  - metadata.version:', state.metadata.version)
    console.log('  - metadata.exportDate:', state.metadata.exportDate)
    console.log('  - metadata.exportVersion:', state.metadata.exportVersion)
    if (state.metadata.buildId) {
      console.log('  - metadata.buildId:', state.metadata.buildId)
    }
    console.log('  - summary.networkCount:', state.summary.networkCount)
    console.log('  - summary.workspaceId:', state.summary.workspaceId)
    console.log('  - summary.currentNetworkId:', state.summary.currentNetworkId)
    console.log('  - summary.networkIds:', state.summary.networkIds.length)
    console.log('  - database keys:', Object.keys(state.database).join(', '))
    console.log('  - stores keys:', Object.keys(state.stores).join(', '))
  } catch (error) {
    console.error('\n❌ Export failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    throw error
  }
}

// Expose to window.debug when debug mode is enabled
import config from '../../../assets/config.json'
if (config.debug) {
  const win = window as unknown as { debug?: Record<string, any> }
  if (win.debug === undefined) {
    win.debug = {}
  }
  win.debug.exportAppState = manualExportAppState
}
