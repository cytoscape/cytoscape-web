/**
 * @fileoverview Database Snapshot Module
 *
 * This module provides functionality to export and import the entire IndexedDB
 * database as a JSON snapshot file.
 *
 * @module db/snapshot
 */

import packageJson from '../../../../package.json'
import config from '../../../assets/config.json'
import { logDb } from '../../../debug'
import { CyApp } from '../../../models/AppModel/CyApp'
import { ServiceApp } from '../../../models/AppModel/ServiceApp'
import { Network } from '../../../models/NetworkModel'
import {
  getDatabaseVersion,
  getDb,
  ObjectStoreNames,
  type ObjectStoreNames as ObjectStoreNamesType,
} from '../index'
import {
  MAX_SNAPSHOT_SIZE_BYTES,
  sanitizeRecord,
  validateSnapshotFile,
  validateSnapshotStructure,
} from './snapshotValidator'

/**
 * Metadata included in database exports for version tracking and validation.
 */
export interface DatabaseExportMetadata {
  version: number // Database schema version
  exportDate: string // ISO timestamp
  exportVersion: string // App version (from package.json)
  buildId?: string // Build ID (git commit hash + commit date)
  buildDate?: string // Build timestamp (ISO string)
}

/**
 * Result of a database import operation.
 */
export interface ImportResult {
  success: boolean
  importedCounts: Record<ObjectStoreNamesType, number>
  skippedCounts?: Record<ObjectStoreNamesType, number>
  errors?: string[]
}

/**
 * Full database snapshot format containing all object stores.
 */
export interface DatabaseSnapshot {
  metadata: DatabaseExportMetadata
  data: {
    [ObjectStoreNames.Workspace]?: any[]
    [ObjectStoreNames.Summaries]?: any[]
    [ObjectStoreNames.CyNetworks]?: Network[]
    [ObjectStoreNames.CyTables]?: any[]
    [ObjectStoreNames.CyVisualStyles]?: any[]
    [ObjectStoreNames.CyNetworkViews]?: any[]
    [ObjectStoreNames.UiState]?: any[]
    [ObjectStoreNames.Timestamp]?: any[]
    [ObjectStoreNames.Filters]?: any[]
    [ObjectStoreNames.Apps]?: CyApp[]
    [ObjectStoreNames.ServiceApps]?: ServiceApp[]
    [ObjectStoreNames.OpaqueAspects]?: any[]
    [ObjectStoreNames.UndoStacks]?: any[]
  }
}

/**
 * Import options for database snapshot import.
 */
export interface ImportOptions {
  /**
   * If true, merge with existing data (skip conflicts).
   * If false, replace existing data (overwrite conflicts).
   * Default: false (replace)
   */
  merge?: boolean

  /**
   * If true, skip records that already exist (based on primary key).
   * Only used when merge is true.
   * Default: false
   */
  skipConflicts?: boolean

  /**
   * List of object stores to import. If undefined, imports all stores.
   * Default: undefined (import all)
   */
  objectStores?: ObjectStoreNamesType[]
}

/**
 * Exports the entire database as a JSON string (snapshot).
 *
 * All object stores are exported in their current serialized format.
 * The export includes metadata for version tracking.
 *
 * @returns Promise resolving to JSON string of the database snapshot
 * @throws Error if export fails
 */
export const exportDatabaseSnapshot = async (): Promise<string> => {
  try {
    const db = await getDb()
    const currentVersion = getDatabaseVersion()
    const appVersion = packageJson.version || '1.0.0'

    // Get build information from environment variables (if available)
    const gitCommit = process.env.REACT_APP_GIT_COMMIT
    const lastCommitTime = process.env.REACT_APP_LAST_COMMIT_TIME
    const buildTime = process.env.REACT_APP_BUILD_TIME

    // Format build ID similar to AboutCytoscapeWebMenuItem
    const formatDateForHash = (dateString: string): string => {
      const date = new Date(dateString)
      const pad = (num: number) => String(num).padStart(2, '0')
      const month = pad(date.getMonth() + 1)
      const day = pad(date.getDate())
      const year = date.getFullYear()
      const hours = pad(date.getHours())
      const minutes = pad(date.getMinutes())
      const seconds = pad(date.getSeconds())
      return `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`
    }

    const buildId =
      gitCommit && lastCommitTime
        ? `${gitCommit.substring(0, 7)}-${formatDateForHash(lastCommitTime)}`
        : undefined

    const metadata: DatabaseExportMetadata = {
      version: currentVersion,
      exportDate: new Date().toISOString(),
      exportVersion: appVersion,
      ...(buildId && { buildId }),
      ...(buildTime && { buildDate: buildTime }),
    }

    // Dynamically export all object stores
    const data: Record<string, any[]> = {}
    for (const table of db.tables) {
      try {
        data[table.name] = await table.toArray()
        logDb.info(
          `[exportDatabaseSnapshot] Exported ${data[table.name].length} records from ${table.name}`,
        )
      } catch (error) {
        logDb.warn(
          `[exportDatabaseSnapshot] Failed to export ${table.name}:`,
          error,
        )
        data[table.name] = []
      }
    }

    const snapshot: DatabaseSnapshot = {
      metadata,
      data: data as DatabaseSnapshot['data'],
    }

    return JSON.stringify(snapshot, null, 2)
  } catch (e) {
    logDb.error('[exportDatabaseSnapshot] error:', e)
    throw e
  }
}

/**
 * Exports the database snapshot and triggers a browser download.
 *
 * @param filename - Optional filename (default: cyweb-db-snapshot-VERSION-YYYY-MM-DD.json)
 * @throws Error if export or download fails
 */
export const exportDatabaseSnapshotToFile = async (
  filename?: string,
): Promise<void> => {
  try {
    const snapshotJson = await exportDatabaseSnapshot()

    // Generate filename if not provided
    if (!filename) {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const appVersion = packageJson.version || '1.0.0'
      filename = `cyweb-db-snapshot-${appVersion}-${date}.json`
    }

    // Create blob and download
    const blob = new Blob([snapshotJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logDb.info('[exportDatabaseSnapshotToFile] Database exported to:', filename)
  } catch (e) {
    logDb.error('[exportDatabaseSnapshotToFile] error:', e)
    throw e
  }
}

/**
 * Imports a database snapshot from a JSON string.
 *
 * @param snapshotJson - JSON string containing the database snapshot
 * @param options - Import options (merge, skipConflicts, objectStores)
 * @returns Promise resolving to ImportResult with statistics
 * @throws Error if import fails or snapshot format is invalid
 */
export const importDatabaseSnapshot = async (
  snapshotJson: string,
  options: ImportOptions = {},
): Promise<ImportResult> => {
  const {
    merge = false,
    skipConflicts = false,
    objectStores = undefined,
  } = options

  try {
    const db = await getDb()
    const currentVersion = getDatabaseVersion()

    // Parse JSON with size check
    if (snapshotJson.length > MAX_SNAPSHOT_SIZE_BYTES) {
      throw new Error(
        `Snapshot size (${snapshotJson.length} bytes) exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE_BYTES} bytes)`,
      )
    }

    let snapshot: DatabaseSnapshot
    try {
      snapshot = JSON.parse(snapshotJson)
    } catch (parseError) {
      throw new Error(
        `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
      )
    }

    // Comprehensive validation
    const validation = validateSnapshotStructure(snapshot, currentVersion)

    if (!validation.isValid) {
      logDb.error(
        '[importDatabaseSnapshot] Snapshot validation failed:',
        validation.errors,
      )
      throw new Error(`Snapshot validation failed: ${validation.errorMessage}`)
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      logDb.warn(
        '[importDatabaseSnapshot] Snapshot validation warnings:',
        validation.warnings,
      )
    }

    const importedCounts: Record<string, number> = {}
    const skippedCounts: Record<string, number> = {}
    const errors: string[] = []

    // Keys mapping for each object store (primary keys)
    // This is a fallback for known stores; we'll try to get the primary key from the table schema if not found
    const Keys: Record<string, string> = {
      [ObjectStoreNames.Workspace]: 'id',
      [ObjectStoreNames.Summaries]: 'externalId',
      [ObjectStoreNames.CyNetworks]: 'id',
      [ObjectStoreNames.CyTables]: 'id',
      [ObjectStoreNames.CyVisualStyles]: 'id',
      [ObjectStoreNames.CyNetworkViews]: 'id',
      [ObjectStoreNames.UiState]: 'id',
      [ObjectStoreNames.Timestamp]: 'id',
      [ObjectStoreNames.Filters]: 'id',
      [ObjectStoreNames.Apps]: 'id',
      [ObjectStoreNames.ServiceApps]: 'url',
      [ObjectStoreNames.OpaqueAspects]: 'id',
      [ObjectStoreNames.UndoStacks]: 'id',
    }

    // Helper function to get primary key for a store
    const getPrimaryKey = (storeName: string): string | null => {
      // First try the Keys mapping
      if (Keys[storeName]) {
        return Keys[storeName]
      }
      // Fallback: try to get from table schema
      try {
        const table = (db as any)[storeName]
        if (table && table.schema && table.schema.primKey) {
          return table.schema.primKey.name
        }
      } catch (error) {
        logDb.warn(
          `[importDatabaseSnapshot] Could not get primary key for ${storeName}:`,
          error,
        )
      }
      return null
    }

    // Determine which stores to import
    // If objectStores is specified, use those; otherwise import all stores found in snapshot
    const storesToImport =
      objectStores ||
      Object.keys(snapshot.data).filter(
        (key) => (snapshot.data as Record<string, any>)[key] !== undefined,
      )

    // Import each object store
    for (const storeName of storesToImport) {
      const snapshotData = snapshot.data as Record<string, any>
      if (!snapshotData[storeName]) {
        logDb.info(
          `[importDatabaseSnapshot] Store ${storeName} not found in snapshot, skipping`,
        )
        continue
      }

      try {
        const records = snapshotData[storeName]
        if (!Array.isArray(records)) {
          errors.push(`Store ${storeName}: data is not an array`)
          continue
        }

        await db.transaction('rw', (db as any)[storeName], async () => {
          let imported = 0
          let skipped = 0

          for (const record of records) {
            try {
              // Sanitize record to prevent security issues
              const sanitizedRecord = sanitizeRecord(record)

              // Get primary key for this store
              const primaryKey = getPrimaryKey(storeName)
              if (!primaryKey) {
                errors.push(
                  `Store ${storeName}: Could not determine primary key. Skipping record.`,
                )
                continue
              }

              // Validate required key exists
              if (!sanitizedRecord[primaryKey]) {
                errors.push(
                  `Store ${storeName}: Record missing required key "${primaryKey}"`,
                )
                continue
              }

              if (merge && skipConflicts) {
                // Check if record exists
                const existing = await (db as any)[storeName].get(
                  sanitizedRecord[primaryKey],
                )
                if (existing) {
                  skipped++
                  continue
                }
              }

              // Put sanitized record (will overwrite if exists, unless merge+skipConflicts)
              await (db as any)[storeName].put(sanitizedRecord)
              imported++
            } catch (recordError) {
              errors.push(
                `Store ${storeName}: Failed to import record: ${recordError instanceof Error ? recordError.message : String(recordError)}`,
              )
            }
          }

          importedCounts[storeName] = imported
          if (merge && skipConflicts) {
            skippedCounts[storeName] = skipped
          }
        })
      } catch (storeError) {
        errors.push(`Store ${storeName}: ${storeError}`)
      }
    }

    const result: ImportResult = {
      success: errors.length === 0,
      importedCounts: importedCounts as Record<ObjectStoreNamesType, number>,
      ...(Object.keys(skippedCounts).length > 0 && { skippedCounts }),
      ...(errors.length > 0 && { errors }),
    }

    logDb.info('[importDatabaseSnapshot] Import completed:', result)
    return result
  } catch (e) {
    logDb.error('[importDatabaseSnapshot] error:', e)
    throw e
  }
}

/**
 * Imports a database snapshot from a File object.
 *
 * @param file - File object containing the JSON snapshot
 * @param options - Import options
 * @returns Promise resolving to ImportResult
 * @throws Error if file validation, read, or import fails
 */
export const importDatabaseSnapshotFromFile = async (
  file: File,
  options: ImportOptions = {},
): Promise<ImportResult> => {
  try {
    // Validate file before reading
    const fileValidation = validateSnapshotFile(file)
    if (!fileValidation.isValid) {
      throw new Error(`File validation failed: ${fileValidation.errorMessage}`)
    }

    if (fileValidation.warnings.length > 0) {
      logDb.warn(
        '[importDatabaseSnapshotFromFile] File validation warnings:',
        fileValidation.warnings,
      )
    }

    // Read file with size check
    if (file.size > MAX_SNAPSHOT_SIZE_BYTES) {
      throw new Error(
        `File size (${file.size} bytes) exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE_BYTES} bytes)`,
      )
    }

    // Delete all workspaces in IndexedDB before importing
    const db = await getDb()
    await db.workspace.clear()
    logDb.info(
      '[importDatabaseSnapshotFromFile] All workspaces cleared from IndexedDB',
    )

    // Use file.text() if available, otherwise fall back to FileReader for test compatibility
    let text: string
    if (typeof file.text === 'function') {
      text = await file.text()
    } else {
      // Fallback for environments where file.text() is not available (e.g., some test environments)
      text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
      })
    }
    return await importDatabaseSnapshot(text, options)
  } catch (e) {
    logDb.error('[importDatabaseSnapshotFromFile] error:', e)
    throw e
  }
}

/**
 * Manual database snapshot export function for browser console.
 * Exposed on window.debug.exportSnapshot when debug mode is enabled.
 *
 * This is a convenience wrapper around exportDatabaseSnapshotToFile that provides
 * console-friendly output and allows overriding the app version.
 *
 * Usage in browser console:
 *   await window.debug.exportSnapshot('1.0.4')
 *
 * @param exportVersion - Optional app version string (defaults to package.json version)
 */
export const manualExportSnapshot = async (
  exportVersion?: string,
): Promise<void> => {
  try {
    console.log('🚀 Starting database snapshot export...')

    // Get database info for logging
    const db = await getDb()
    const dbVersion = getDatabaseVersion()
    const objectStoreNames = db.tables.map((table) => table.name)
    const appVersion = exportVersion || packageJson.version || '1.0.0'

    console.log(`📦 Database: cyweb-db`)
    console.log(`🔢 Database Version: ${dbVersion}`)
    console.log(
      `📋 Object Stores (${objectStoreNames.length}):`,
      objectStoreNames.join(', '),
    )
    console.log(`📱 App Version: ${appVersion}`)

    // Generate filename with custom version if provided
    let filename: string | undefined
    if (exportVersion) {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      filename = `cyweb-db-snapshot-${exportVersion}-${date}.json`
    }

    console.log('\n📊 Exporting database...')

    // Export and get snapshot JSON for stats
    const snapshotJson = await exportDatabaseSnapshot()
    const snapshot = JSON.parse(snapshotJson)

    // Generate filename if not provided
    if (!filename) {
      const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      filename = `cyweb-db-snapshot-${appVersion}-${date}.json`
    }

    // Download the file
    const blob = new Blob([snapshotJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Calculate stats
    const totalRecords = Object.values(snapshot.data).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0,
    )
    const snapshotSize = snapshotJson.length
    const snapshotSizeMB = (snapshotSize / (1024 * 1024)).toFixed(2)

    console.log('\n✅ Snapshot exported successfully!')
    if (filename) {
      console.log(`📁 Filename: ${filename}`)
    }
    console.log(`📊 Total records: ${totalRecords}`)
    console.log(`💾 File size: ${snapshotSizeMB} MB`)
    console.log('\n📋 Snapshot structure:')
    console.log('  - metadata.version:', snapshot.metadata.version)
    console.log('  - metadata.exportDate:', snapshot.metadata.exportDate)
    console.log('  - metadata.exportVersion:', snapshot.metadata.exportVersion)
    if (snapshot.metadata.buildId) {
      console.log('  - metadata.buildId:', snapshot.metadata.buildId)
    }
    if (snapshot.metadata.buildDate) {
      console.log('  - metadata.buildDate:', snapshot.metadata.buildDate)
    }
    console.log('  - data keys:', Object.keys(snapshot.data).join(', '))
  } catch (error) {
    console.error('\n❌ Export failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)

      if (error.name === 'VersionError') {
        console.error('\n💡 Tip: The database version may have changed.')
      }

      if (error.name === 'InvalidStateError') {
        console.error(
          '\n💡 Tip: The database may be in use. Close other tabs and try again.',
        )
      }
    }
    throw error
  }
}

// Expose to window.debug when debug mode is enabled
if (config.debug) {
  const win = window as unknown as { debug?: Record<string, any> }
  if (win.debug === undefined) {
    win.debug = {}
  }
  win.debug.exportSnapshot = manualExportSnapshot
}
