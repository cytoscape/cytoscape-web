/**
 * Error Report API
 *
 * Module for sending error reports with database snapshots to the error reporting endpoint.
 */

import appConfig from '../../../assets/config.json'
import { logDb } from '../../../debug'
import type { DatabaseSnapshot } from '../../db/snapshot'
import { getDb, getDatabaseVersion, ObjectStoreNames } from '../../db'
import packageJson from '../../../../package.json'

/**
 * Envelope expected by https://dev1.ndexbio.org/report
 *
 * curl -X POST https://dev1.ndexbio.org/report \
 *   -H "Content-Type: application/json" \
 *   -d '{"summary":"...","data":{...}}'
 */
export interface ErrorReportPayload {
  summary: string
  data: CrashReportData
}

export type SnapshotType = 'full' | 'partial'

export interface CrashReportData {
  kind: 'cyweb-crash-report'
  schemaVersion: 1
  timestamp: string
  url: string
  route: string
  workspaceId?: string
  networkId?: string
  app: {
    version: string
    dbVersion: number
    buildId?: string
    buildDate?: string
  }
  error: {
    name?: string
    message: string
    stack?: string
    routeErrorResponse?: {
      status?: number
      statusText?: string
    }
  }
  environment: {
    userAgent: string
    language?: string
    platform?: string
    viewport: { width: number; height: number }
    memory?: {
      jsHeapSizeLimit: number
      totalJSHeapSize: number
      usedJSHeapSize: number
    }
  }
  snapshot: {
    type: SnapshotType
    sizeBytes: number
    data: DatabaseSnapshot
  }
}

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

const getBuildId = (): string | undefined => {
  const gitCommit = process.env.REACT_APP_GIT_COMMIT
  const lastCommitTime = process.env.REACT_APP_LAST_COMMIT_TIME
  if (!gitCommit || !lastCommitTime) {
    return undefined
  }
  return `${gitCommit.substring(0, 7)}-${formatDateForHash(lastCommitTime)}`
}

const getMemoryInfo = (): CrashReportData['environment']['memory'] | undefined => {
  const anyPerformance = performance as unknown as {
    memory?: {
      jsHeapSizeLimit: number
      totalJSHeapSize: number
      usedJSHeapSize: number
    }
  }
  return anyPerformance.memory
}

export const createCrashReportPayload = (params: {
  url: string
  route: string
  workspaceId?: string
  networkId?: string
  snapshot: DatabaseSnapshot
  snapshotType: SnapshotType
  snapshotSizeBytes: number
  error: {
    name?: string
    message: string
    stack?: string
    routeErrorResponse?: {
      status?: number
      statusText?: string
    }
  }
}): ErrorReportPayload => {
  const appVersion = packageJson.version || 'unknown'
  const dbVersion = getDatabaseVersion()
  const buildId = getBuildId()
  const buildDate = process.env.REACT_APP_BUILD_TIME

  const summaryNetworkPart = params.networkId ? ` (network=${params.networkId})` : ''
  const summary = `[Crash] ${params.error.message}${summaryNetworkPart}`

  return {
    summary,
    data: {
      kind: 'cyweb-crash-report',
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      url: params.url,
      route: params.route,
      workspaceId: params.workspaceId,
      networkId: params.networkId,
      app: {
        version: appVersion,
        dbVersion,
        ...(buildId && { buildId }),
        ...(buildDate && { buildDate }),
      },
      error: {
        name: params.error.name,
        message: params.error.message,
        stack: params.error.stack,
        routeErrorResponse: params.error.routeErrorResponse,
      },
      environment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: (navigator as any).platform,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        ...(getMemoryInfo() && { memory: getMemoryInfo() }),
      },
      snapshot: {
        type: params.snapshotType,
        sizeBytes: params.snapshotSizeBytes,
        data: params.snapshot,
      },
    },
  }
}

export const sendErrorReport = async (payload: ErrorReportPayload): Promise<void> => {
  const endpoint = appConfig.errorReportEndpoint

  if (!endpoint || endpoint === '') {
    logDb.warn('[sendErrorReport] Error report endpoint not configured, skipping')
    return
  }

  try {
    const approxSizeBytes = new Blob([JSON.stringify(payload)]).size
    logDb.info(
      `[sendErrorReport] Sending error report (${approxSizeBytes} bytes) to ${endpoint}`,
    )

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(
        `Error report failed with status ${response.status}: ${response.statusText}`,
      )
    }

    logDb.info('[sendErrorReport] Error report sent successfully')
  } catch (e) {
    logDb.error('[sendErrorReport] Failed to send error report:', e)
    throw e
  }
}

/**
 * Exports a partial database snapshot containing only data for a specific network.
 * The snapshot is in the same format as a full snapshot and can be imported via ImportDatabaseMenuItem.
 *
 * @param networkId - Network ID to export
 * @returns Promise resolving to DatabaseSnapshot containing only the specified network's data
 * @throws Error if network not found or export fails
 */
export const exportPartialSnapshotForNetwork = async (
  networkId: string,
): Promise<DatabaseSnapshot> => {
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

    const metadata = {
      version: currentVersion,
      exportDate: new Date().toISOString(),
      exportVersion: appVersion,
      ...(buildId && { buildId }),
      ...(buildTime && { buildDate: buildTime }),
    }

    // Export only data related to the specified network
    const data: Record<string, any[]> = {}

    // Export workspace (may contain reference to network)
    try {
      const workspaces = await db.workspace.toArray()
      data[ObjectStoreNames.Workspace] = workspaces.filter(
        (ws) => ws.networkIds?.includes(networkId) || ws.currentNetworkId === networkId,
      )
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export workspace:`,
        error,
      )
      data[ObjectStoreNames.Workspace] = []
    }

    // Export summary for this network
    try {
      const summary = await db.summaries.get({ externalId: networkId })
      data[ObjectStoreNames.Summaries] = summary ? [summary] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export summary:`,
        error,
      )
      data[ObjectStoreNames.Summaries] = []
    }

    // Export network
    try {
      const network = await db.cyNetworks.get({ id: networkId })
      data[ObjectStoreNames.CyNetworks] = network ? [network] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export network:`,
        error,
      )
      data[ObjectStoreNames.CyNetworks] = []
    }

    // Export tables
    try {
      const table = await db.cyTables.get({ id: networkId })
      data[ObjectStoreNames.CyTables] = table ? [table] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export tables:`,
        error,
      )
      data[ObjectStoreNames.CyTables] = []
    }

    // Export visual style
    try {
      const visualStyle = await db.cyVisualStyles.get({ id: networkId })
      data[ObjectStoreNames.CyVisualStyles] = visualStyle ? [visualStyle] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export visual style:`,
        error,
      )
      data[ObjectStoreNames.CyVisualStyles] = []
    }

    // Export network views
    try {
      const networkView = await db.cyNetworkViews.get({ id: networkId })
      data[ObjectStoreNames.CyNetworkViews] = networkView ? [networkView] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export network views:`,
        error,
      )
      data[ObjectStoreNames.CyNetworkViews] = []
    }

    // Export UI state (may contain network-specific data)
    try {
      const uiState = await db.uiState.toArray()
      // Filter UI state to only include relevant data
      data[ObjectStoreNames.UiState] = uiState.length > 0 ? uiState : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export UI state:`,
        error,
      )
      data[ObjectStoreNames.UiState] = []
    }

    // Export timestamp
    try {
      const timestamp = await db.timestamp.get({ id: networkId })
      data[ObjectStoreNames.Timestamp] = timestamp ? [timestamp] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export timestamp:`,
        error,
      )
      data[ObjectStoreNames.Timestamp] = []
    }

    // Export filters (may be network-specific)
    try {
      const filters = await db.filters.toArray()
      data[ObjectStoreNames.Filters] = filters.filter(
        (f) => f.networkId === networkId,
      )
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export filters:`,
        error,
      )
      data[ObjectStoreNames.Filters] = []
    }

    // Export opaque aspects
    try {
      const opaqueAspects = await db.opaqueAspects.get({ id: networkId })
      data[ObjectStoreNames.OpaqueAspects] = opaqueAspects ? [opaqueAspects] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export opaque aspects:`,
        error,
      )
      data[ObjectStoreNames.OpaqueAspects] = []
    }

    // Export undo stacks
    try {
      const undoStack = await db.undoStacks.get({ id: networkId })
      data[ObjectStoreNames.UndoStacks] = undoStack ? [undoStack] : []
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export undo stacks:`,
        error,
      )
      data[ObjectStoreNames.UndoStacks] = []
    }

    // Apps and ServiceApps are global, include them but they're usually small
    try {
      data[ObjectStoreNames.Apps] = await db.apps.toArray()
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export apps:`,
        error,
      )
      data[ObjectStoreNames.Apps] = []
    }

    try {
      data[ObjectStoreNames.ServiceApps] = await db.serviceApps.toArray()
    } catch (error) {
      logDb.warn(
        `[exportPartialSnapshotForNetwork] Failed to export service apps:`,
        error,
      )
      data[ObjectStoreNames.ServiceApps] = []
    }

    const snapshot: DatabaseSnapshot = {
      metadata,
      data: data as DatabaseSnapshot['data'],
    }

    return snapshot
  } catch (e) {
    logDb.error(
      `[exportPartialSnapshotForNetwork] Failed to export partial snapshot for network ${networkId}:`,
      e,
    )
    throw e
  }
}

