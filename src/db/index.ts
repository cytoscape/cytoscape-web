/**
 * @fileoverview IndexedDB Database Module for Cytoscape Web
 *
 * This module provides a centralized database interface using Dexie (IndexedDB wrapper)
 * for persisting application state and network data in the browser. It manages:
 *
 * - Network topology data (nodes, edges)
 * - Network metadata and summaries
 * - Table data (node and edge attribute tables)
 * - Visual styles and styling configurations
 * - Network views (camera positions, zoom levels, etc.)
 * - UI state and preferences
 * - Workspace configurations
 * - Filter configurations
 * - Application metadata (CyApps, ServiceApps)
 * - Opaque aspects (CX2 format extensions)
 * - Undo/redo stacks for network editing
 *
 * The database uses a versioned schema that supports migrations when the schema changes.
 * All data is serialized/deserialized to handle complex types (like Maps) that cannot be
 * directly stored in IndexedDB.
 *
 * @module db/index
 */

import 'dexie-observable'

import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import _ from 'lodash'

import config from '../assets/config.json'
import { logDb } from '../debug'
import { getNetworkViewId } from '../hooks/stores/ViewModelStore'
import { CyApp } from '../models/AppModel/CyApp'
import { ServiceApp } from '../models/AppModel/ServiceApp'
import { CyNetwork } from '../models/CyNetworkModel'
import { FilterConfig } from '../models/FilterModel/FilterConfig'
import { IdType } from '../models/IdType'
import NetworkFn, { Edge, Network, Node } from '../models/NetworkModel'
import { NetworkSummary } from '../models/NetworkSummaryModel'
import { OpaqueAspects } from '../models/OpaqueAspectModel'
import { UndoRedoStack } from '../models/StoreModel/UndoStoreModel'
import { Table } from '../models/TableModel'
import { Ui } from '../models/UiModel'
import { NetworkView } from '../models/ViewModel'
import { VisualStyle } from '../models/VisualStyleModel'
import { VisualStyleOptions } from '../models/VisualStyleModel/VisualStyleOptions'
import { Workspace } from '../models/WorkspaceModel'
import { createWorkspace } from '../models/WorkspaceModel/impl/workspaceImpl'
import {
  deserializeFilterConfig,
  deserializeNetworkView,
  deserializeTable,
  deserializeVisualStyle,
  serializeFilterConfig,
  serializeNetworkView,
  serializeTable,
  serializeVisualStyle,
} from './serialization'
import { applyMigrations } from './migrations'

/**
 * Unique, fixed database name for Cytoscape Web.
 * This name is used consistently across all browser storage instances.
 */
const DB_NAME: string = 'cyweb-db'

/**
 * Current database schema version (integer only).
 *
 * When the database schema changes, increment this version number.
 * If an older version is detected, the migration function will automatically
 * upgrade the existing data to this version.
 *
 * @see applyMigrations
 */
const currentVersion: number = 7

/**
 * Predefined object store names for IndexedDB.
 *
 * Each object store represents a different type of data persisted in the database.
 * When adding a new object store:
 * 1. Add the name here
 * 2. Add the corresponding primary key in the `Keys` object
 * 3. Add the table property to the `CyDB` class
 * 4. Increment `currentVersion` to trigger a migration
 *
 * @see Keys - Primary keys for each object store
 * @see CyDB - Database class with table definitions
 */
export const ObjectStoreNames = {
  Workspace: 'workspace',
  Summaries: 'summaries',
  CyNetworks: 'cyNetworks',
  CyTables: 'cyTables',
  CyVisualStyles: 'cyVisualStyles',
  CyNetworkViews: 'cyNetworkViews',
  UiState: 'uiState',
  Timestamp: 'timestamp',
  Filters: 'filters',
  Apps: 'apps',

  // From v3
  ServiceApps: 'serviceApps',

  // From V4
  OpaqueAspects: 'opaqueAspects',

  UndoStacks: 'undoStacks',
} as const

/**
 * Type derived from the object store names.
 * Used for type-safe references to object store names.
 */
export type ObjectStoreNames =
  (typeof ObjectStoreNames)[keyof typeof ObjectStoreNames]

/**
 * Primary key definitions for each object store.
 *
 * Maps each object store name to its primary key field name.
 * The primary key is used by IndexedDB to uniquely identify records.
 *
 * Note: Most stores use 'id' as the primary key, except:
 * - Summaries: uses 'externalId' (typically NDEx UUID)
 * - ServiceApps: uses 'url' (service endpoint URL)
 */
const Keys = {
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
} as const

/**
 * Main database class extending Dexie (IndexedDB wrapper).
 *
 * Defines all object stores and their TypeScript types.
 * The database is initialized to the current version and migrations are applied
 * automatically when the schema version changes.
 *
 * Note: Some tables use `any` type because they store serialized data that
 * gets deserialized when retrieved. The actual types are:
 * - Workspace: Workspace
 * - CyTables: { id: IdType, nodeTable: TableWithRecords, edgeTable: TableWithRecords }
 * - CyVisualStyles: { id: IdType, visualStyle: VisualStyleWithRecords }
 * - Summaries: NetworkSummary
 * - CyNetworkViews: { id: IdType, views: NetworkViewWithRecords[] }
 * - UiState: { id: string, ...Ui }
 * - Timestamp: { id: string, timestamp: number }
 * - Filters: { id: string, ...FilterConfigWithRecords }
 */
class CyDB extends Dexie {
  [ObjectStoreNames.Workspace]!: DxTable<any>;
  [ObjectStoreNames.CyNetworks]!: DxTable<Network>;
  [ObjectStoreNames.CyTables]!: DxTable<any>;
  [ObjectStoreNames.CyVisualStyles]!: DxTable<any>;
  [ObjectStoreNames.Summaries]!: DxTable<any>;
  [ObjectStoreNames.CyNetworkViews]!: DxTable<any>;
  [ObjectStoreNames.UiState]!: DxTable<any>;
  [ObjectStoreNames.Timestamp]!: DxTable<any>;
  [ObjectStoreNames.Filters]!: DxTable<any>;
  [ObjectStoreNames.Apps]!: DxTable<CyApp>;

  // From v3
  [ObjectStoreNames.ServiceApps]!: DxTable<ServiceApp>;

  // From v4
  [ObjectStoreNames.OpaqueAspects]!: DxTable<any>;

  [ObjectStoreNames.UndoStacks]!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(currentVersion).stores(Keys)

    // Apply migrations when the database is created or upgraded.
    // This should only be called once per database instance.
    // Migrations handle schema changes and data transformations.
    applyMigrations(this, currentVersion).catch((err) =>
      logDb.error('[applyMigrations] Failed to apply migrations', err),
    )
  }
}

/**
 * Global database instance.
 * Initialized at module load time and reused throughout the application.
 */
let db: CyDB
try {
  db = new CyDB(DB_NAME)
} catch (err) {
  logDb.error('[initializeDb] Failed to create Dixie instance', err)
  throw err
}

/**
 * Initializes and opens the IndexedDB database.
 *
 * This function must be called before using any database operations.
 * It opens the database connection, validates that all expected object stores
 * exist, and sets up event listeners for database lifecycle events.
 *
 * In debug mode, the database instance is exposed on `window.debug.db` for
 * inspection in browser dev tools.
 *
 * @throws Error if database initialization fails
 */
export const initializeDb = async (): Promise<void> => {
  await db.open()
  logDb.info('[initializeDb] IndexedDB is opened')

  // Validate that all expected object stores are available
  const currentNames = new Set<string>(db.tables.map((table) => table.name))
  Object.values(ObjectStoreNames).forEach((name) => {
    if (!currentNames.has(name)) {
      logDb.warn(`[initializeDb] Object store ${name} is not found`)
    }
  })

  db.on('ready', () => {
    logDb.info(`[initializeDb] Indexed DB version ${db.verno} is ready`)
  })

  db.on('versionchange', function (event) {
    logDb.info(
      `[initializeDb] IndexedDB version change has been detected.`,
      event,
    )
  })

  if (config.debug) {
    const win = window as unknown as { debug?: Record<string, any> }
    if (win.debug === undefined) {
      win.debug = {}
    }
    win.debug.db = db
  }
}

/**
 * Gets the current database schema version.
 *
 * @returns The version number of the database schema
 */
export const getDatabaseVersion = (): number => {
  return db.verno
}

/**
 * Gets the database instance.
 *
 * @returns Promise resolving to the CyDB instance
 */
export const getDb = async (): Promise<CyDB> => {
  return await Promise.resolve(db)
}

/**
 * Closes the database connection.
 *
 * This should be called when the application is shutting down or
 * when database access is no longer needed.
 */
export const closeDb = async (): Promise<void> => {
  await db.close()
}

/**
 * Deletes the current database and creates a new empty one.
 *
 * WARNING: This operation permanently deletes all stored data including:
 * - Networks, tables, visual styles, views
 * - Workspaces and UI state
 * - Filters, apps, and all other persisted data
 *
 * This is typically used for:
 * - Development/testing purposes
 * - Resetting the application to a clean state
 * - Recovering from database corruption
 *
 * @throws Error if database deletion or recreation fails
 */
export const deleteDb = async (): Promise<void> => {
  try {
    if (db) {
      db.close()
      logDb.info('[DeleteDB] DB is closed')
    }
    await Dexie.delete(DB_NAME)
    logDb.info(`[DeleteDB]  ${DB_NAME} is deleted`)
    db = new CyDB(DB_NAME)
    await db.open()
    logDb.info(`[DeleteDB] ${DB_NAME} is opened and ready to use`)
  } catch (err) {
    logDb.error('[DeleteDB] Failed to reset DB', err)
  }
}
/**
 * Gets all network IDs stored in the database.
 *
 * @returns Promise resolving to an array of network IDs
 */
export const getAllNetworkKeys = async (): Promise<IdType[]> => {
  return (await db.cyNetworks.toCollection().primaryKeys()) as IdType[]
}

/**
 * Persists a network's topology (nodes and edges) to IndexedDB.
 *
 * Only stores the network structure (id, nodes, edges), not associated
 * data like tables, visual styles, or views. Those are stored separately.
 *
 * @param network Network object containing id, nodes, and edges
 * @throws Error if the database operation fails
 */
export const putNetworkToDb = async (network: Network): Promise<void> => {
  try {
    await db.transaction('rw', db.cyNetworks, async () => {
      // Store plain network topology only
      await db.cyNetworks.put(cyNetwork2Network(network))
    })
  } catch (e) {
    logDb.error('[putNetworkToDb] error:', e, network)
    throw e
  }
}

/**
 * Extracts only the network topology (id, nodes, edges) from a Network object.
 *
 * This function ensures that only the essential network structure is stored,
 * stripping out any additional properties that may be present on the Network object.
 *
 * @param cyNetwork - Full network object (may contain extra properties)
 * @returns Network object with only id, nodes, and edges
 */
const cyNetwork2Network = (cyNetwork: Network): Network => {
  const { id } = cyNetwork
  const nodes: Node[] = cyNetwork.nodes
  const edges: Edge[] = cyNetwork.edges

  return {
    id,
    nodes,
    edges,
  }
}

/**
 * Retrieves a network's topology from IndexedDB.
 *
 * @param id - Network ID to retrieve
 * @returns Promise resolving to Network object, or undefined if not found
 */
export const getNetworkFromDb = async (
  id: IdType,
): Promise<Network | undefined> => {
  const network: Network | undefined = await db.cyNetworks.get({ id })
  if (network !== undefined) {
    return NetworkFn.networkModelToImplNetwork(network)
  }
}

/**
 * Deletes a network's topology from IndexedDB.
 *
 * Note: This only deletes the network structure. Associated data (tables,
 * visual styles, views, etc.) must be deleted separately.
 *
 * @param id - Network ID to delete
 */
export const deleteNetworkFromDb = async (id: IdType): Promise<void> => {
  await db
    .transaction('rw', db.cyNetworks, async () => {
      await db.cyNetworks.delete(id)
    })
    .catch((err) => {
      logDb.error('[deleteNetworkFromDb] error:', err)
    })
}

/**
 * Deletes all networks from the database.
 *
 * WARNING: This permanently removes all network topology data.
 * Associated tables, styles, and views are not affected.
 */
export const clearNetworksFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyNetworks, async () => {
    await db.cyNetworks.clear()
  })
}

/**
 * Retrieves node and edge attribute tables for a network.
 *
 * Returns deserialized Table objects with Map-based row storage.
 * If no tables exist for the network, returns empty tables with default IDs.
 *
 * @param id - Network ID
 * @returns Promise resolving to an object with `nodeTable` and `edgeTable` properties
 */
export const getTablesFromDb = async (
  id: IdType,
): Promise<{
  nodeTable: Table
  edgeTable: Table
}> => {
  const cached: any = await db.cyTables.get({ id })

  if (cached === undefined) {
    return {
      nodeTable: { id: `${id}-nodes`, columns: [], rows: new Map() },
      edgeTable: { id: `${id}-edges`, columns: [], rows: new Map() },
    }
  }

  return {
    ...cached,
    nodeTable: deserializeTable(cached.nodeTable),
    edgeTable: deserializeTable(cached.edgeTable),
  }
}
/**
 * Persists node and edge attribute tables to IndexedDB.
 *
 * Tables are serialized before storage (Maps converted to arrays) because
 * IndexedDB cannot directly store Map objects.
 *
 * @param id - Network ID to associate the tables with
 * @param nodeTable - Node attribute table
 * @param edgeTable - Edge attribute table
 * @throws Error if the database operation fails
 */
export const putTablesToDb = async (
  id: IdType,
  nodeTable: Table,
  edgeTable: Table,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyTables, async () => {
      logDb.info(
        '[putTablesToDb] putting tables for ID:',
        id,
        serializeTable(nodeTable),
        serializeTable(edgeTable),
      )
      await db.cyTables.put({
        id,
        nodeTable: serializeTable(nodeTable),
        edgeTable: serializeTable(edgeTable),
      })
    })
  } catch (e) {
    logDb.error('[putTablesToDb] error:', e, id, nodeTable, edgeTable)
    throw e
  }
}

/**
 * Deletes node and edge tables for a specific network.
 *
 * @param id - Network ID whose tables should be deleted
 */
export const deleteTablesFromDb = async (id: IdType): Promise<void> => {
  await db.cyTables.delete(id)
}

/**
 * Deletes all node and edge tables from the database.
 *
 * WARNING: This permanently removes all table data for all networks.
 */
export const clearTablesFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyTables, async () => {
    await db.cyTables.clear()
  })
}

// ============================================================================
// Workspace Management
// ============================================================================

/**
 * Persists a workspace to IndexedDB.
 *
 * @param workspace - Workspace object to store
 * @throws Error if the database operation fails
 */
export const putWorkspaceToDb = async (workspace: Workspace): Promise<void> => {
  try {
    await db.workspace.put({ ...workspace })
  } catch (e) {
    logDb.error('[putWorkspaceToDb] error:', e, workspace)
    throw e
  }
}

/**
 * Updates specific fields of a workspace in IndexedDB.
 *
 * @param id - Workspace ID to update
 * @param value - Object containing the fields to update (partial Workspace)
 * @returns Promise resolving to the updated record's key
 */
export const updateWorkspaceDb = async (
  id: IdType,
  value: Record<string, any>,
): Promise<IndexableType> => {
  return await db.workspace.update(id, value)
}

/**
 * Retrieves a workspace from IndexedDB.
 *
 * Behavior:
 * - If an ID is provided: returns that specific workspace, or creates a new one if not found
 * - If no ID is provided: returns the first workspace found, or creates a new one if none exist
 *
 * NOTE: When multiple workspaces exist and no ID is specified, this function
 * currently returns the first workspace (index 0). In production, this should
 * be updated to select the most recently used or newest workspace.
 *
 * @param id - Optional workspace ID. If undefined or empty, returns first available workspace
 * @returns Promise resolving to a Workspace object (always returns a workspace, creates one if needed)
 */
export const getWorkspaceFromDb = async (id?: IdType): Promise<Workspace> => {
  // Check if there is any workspace in the DB
  const workspaceCount: number = await db.workspace.count()
  logDb.info('[getWorkspaceFromDb] workspace count:', workspaceCount)

  if (id === undefined || id === '') {
    logDb.info('[getWorkspaceFromDb] Workspace ID is not specified.')

    if (workspaceCount === 0) {
      logDb.info(
        '[getWorkspaceFromDb] No workspace found. Initializing a new workspace.',
      )
      // Initialize all data
      const newWs: Workspace = createWorkspace()
      await db.transaction('rw', db.workspace, async () => {
        await putWorkspaceToDb(newWs)
        logDb.info('[getWorkspaceFromDb] New workspace created')
      })
      logDb.info('[getWorkspaceFromDb] New workspace created:', newWs)
      return newWs
    } else {
      logDb.info('[getWorkspaceFromDb] Workspace(s) found in the DB.')
      const allWS: Workspace[] = await db.workspace.toArray()
      logDb.info('[getWorkspaceFromDb] All workspaces:', allWS)

      // TODO: In production, pick the newest/most recently used workspace instead of first
      // This could be based on a timestamp field or lastModified date
      const lastWs: Workspace = allWS[0]
      logDb.info('[getWorkspaceFromDb] Returning the first workspace:', lastWs)
      return lastWs
    }
  }

  logDb.info('[getWorkspaceFromDb] Workspace ID is specified:', id)

  const cachedWorkspace: Workspace = await db.workspace.get(id)
  if (cachedWorkspace !== undefined) {
    logDb.info(
      '[getWorkspaceFromDb] Found workspace with ID:',
      id,
      cachedWorkspace,
    )
    return cachedWorkspace
  } else {
    logDb.info('[getWorkspaceFromDb] No workspace found with ID:', id)

    if (workspaceCount === 0) {
      logDb.info(
        '[getWorkspaceFromDb] No workspaces in DB. Creating a new workspace.',
      )
      const newWs: Workspace = createWorkspace()
      await putWorkspaceToDb(newWs)
      logDb.info('[getWorkspaceFromDb] New workspace created:', newWs)
      return newWs
    } else {
      logDb.info(
        '[getWorkspaceFromDb] Returning the first workspace from the DB.',
      )
      const allWS: Workspace[] = await db.workspace.toArray()
      const lastWs: Workspace = allWS[0]
      logDb.info('[getWorkspaceFromDb] Returning workspace:', lastWs)
      return lastWs
    }
  }
}

// ============================================================================
// Network Summaries Management
// ============================================================================
// Network summaries contain metadata about networks (typically from NDEx).
// The primary key is 'externalId' (usually an NDEx UUID), not the internal network ID.

/**
 * Retrieves a network summary by external ID (typically NDEx UUID).
 *
 * @param externalId - External identifier (usually NDEx UUID)
 * @returns Promise resolving to NetworkSummary or undefined if not found
 */
export const getNetworkSummaryFromDb = async (
  externalId: IdType,
): Promise<NetworkSummary | undefined> => {
  return await db.summaries.get({ externalId })
}

/**
 * Retrieves multiple network summaries by their external IDs.
 *
 * @param externalIds - Array of external identifiers
 * @returns Promise resolving to array of NetworkSummary objects (may include undefined for missing IDs)
 */
export const getNetworkSummariesFromDb = async (
  externalIds: IdType[],
): Promise<NetworkSummary[]> => {
  return await db.summaries.bulkGet(externalIds)
}

/**
 * Persists a network summary to IndexedDB.
 *
 * The summary's `externalId` field is used as the primary key.
 *
 * @param summary - NetworkSummary object to store
 * @throws Error if the database operation fails
 */
export const putNetworkSummaryToDb = async (
  summary: NetworkSummary,
): Promise<void> => {
  try {
    // ExternalId will be used as the primary key
    await db.summaries.put({ ...summary })
  } catch (e) {
    logDb.error('[putNetworkSummaryToDb] error:', e, summary)
    throw e
  }
}

/**
 * Deletes a network summary by external ID.
 *
 * @param externalId - External identifier of the summary to delete
 */
export const deleteNetworkSummaryFromDb = async (
  externalId: IdType,
): Promise<void> => {
  await db.summaries.delete(externalId)
}

/**
 * Deletes all network summaries from the database.
 *
 * WARNING: This permanently removes all summary metadata.
 */
export const clearNetworkSummaryFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.summaries, async () => {
    await db.summaries.clear()
  })
}

// ============================================================================
// Visual Styles Management
// ============================================================================
interface VisualStyleWithId {
  id: IdType
  visualStyle: VisualStyle
}

/**
 * Retrieves a visual style for a network.
 *
 * @param id - Network ID
 * @returns Promise resolving to VisualStyle or undefined if not found
 */
export const getVisualStyleFromDb = async (
  id: IdType,
): Promise<VisualStyle | undefined> => {
  const vsId: VisualStyleWithId | undefined = await db.cyVisualStyles.get({
    id,
  })
  if (vsId !== undefined) {
    return deserializeVisualStyle(vsId.visualStyle as any)
  } else {
    return undefined
  }
}

/**
 * Persists a visual style for a network.
 *
 * The visual style is serialized before storage and associated with the network ID.
 *
 * @param id - Network ID to associate the visual style with
 * @param visualStyle - VisualStyle object to store
 * @throws Error if the database operation fails
 */
export const putVisualStyleToDb = async (
  id: IdType,
  visualStyle: VisualStyle,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyVisualStyles, async () => {
      // Need to add ID because VisualStyle type does not include an ID field
      return await db.cyVisualStyles.put({
        id,
        visualStyle: serializeVisualStyle(visualStyle),
      })
    })
  } catch (e) {
    logDb.error('[putVisualStyleToDb] error:', e, id, visualStyle)
    throw e
  }
}

/**
 * Deletes a visual style for a network.
 *
 * @param id - Network ID whose visual style should be deleted
 */
export const deleteVisualStyleFromDb = async (id: IdType): Promise<void> => {
  await db.cyVisualStyles.delete(id)
}

/**
 * Deletes all visual styles from the database.
 *
 * WARNING: This permanently removes all visual style configurations.
 */
export const clearVisualStyleFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyVisualStyles, async () => {
    await db.cyVisualStyles.clear()
  })
}

// ============================================================================
// Network Views Management
// ============================================================================
// Network views store camera positions, zoom levels, and other view state
// for each network. Multiple views per network are supported.
//

/**
 * Retrieves all network views for a given network ID.
 *
 * @param id - Network ID
 * @returns Promise resolving to array of NetworkView objects, or undefined if no views exist
 */
export const getNetworkViewsFromDb = async (
  id: IdType,
): Promise<NetworkView[] | undefined> => {
  const entry = await db.cyNetworkViews.get({ id })
  return entry?.views.map((v: any) =>
    deserializeNetworkView(v),
  ) as NetworkView[]
}
/**
 * Adds or updates a network view in the database.
 *
 * Behavior:
 * - If a view with the same viewId exists, it is updated
 * - If no viewId is provided, one is generated automatically
 * - If the view doesn't exist, it is added to the list
 *
 * @param id - Network model ID
 * @param view - NetworkView to be added or updated
 * @throws Error if the database operation fails
 */
export const putNetworkViewToDb = async (
  id: IdType,
  view: NetworkView,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyNetworkViews, async () => {
      if (view === undefined) {
        logDb.info(
          '[putNetworkViewToDb] view is undefined, exiting early for id:',
          id,
        )
        return
      }
      const viewList = await getNetworkViewsFromDb(id)
      if (viewList !== undefined) {
        // Check if a view with the same viewId already exists
        let found = false
        viewList.forEach((v: NetworkView, idx: number) => {
          const key1 = v.viewId
          const key2 = view.viewId
          if (key1 === key2) {
            // Update existing view
            viewList[idx] = view
            found = true
          }
        })

        if (!found) {
          // Generate viewId if not provided
          if (view.viewId === undefined) {
            view.viewId = getNetworkViewId(view, viewList)
          }
          // Add new view to the list
          viewList.push(view)
        }

        const serializedViewList = viewList.map((v) => serializeNetworkView(v))

        await db.cyNetworkViews.put({
          id,
          views: serializedViewList,
        })
      } else {
        if (view.viewId === undefined) {
          // Add ID if not given
          view.viewId = getNetworkViewId(view, [])
        }

        const serializedView = serializeNetworkView(view)
        await db.cyNetworkViews.put({ id, views: [serializedView] })
      }
    })
  } catch (e) {
    logDb.error('[putNetworkViewToDb] error:', e, id, view)
    throw e
  }
}

/**
 * Updates multiple network views in the database at once.
 *
 * This replaces all existing views for the network with the provided views.
 * Note: Views with type 'circlePacking' are filtered out before storage.
 * This is likely because circle packing views are temporary or computed on-the-fly.
 *
 * @param id - Network model ID
 * @param views - Array of NetworkView objects to store (replaces existing views)
 * @throws Error if the database operation fails
 */
export const putNetworkViewsToDb = async (
  id: IdType,
  views: NetworkView[],
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyNetworkViews, async () => {
      await db.cyNetworkViews.put({
        id,
        views: views
          .filter((v) => v.type !== 'circlePacking')
          .map((v) => serializeNetworkView(v)),
      })
    })
  } catch (e) {
    logDb.error('[putNetworkViewsToDb] error:', e, id, views)
    throw e
  }
}

/**
 * Deletes all network views for a specific network.
 *
 * @param id - Network ID whose views should be deleted
 */
export const deleteNetworkViewsFromDb = async (id: IdType): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.delete(id)
  })
}

/**
 * Deletes all network views from the database for all networks.
 *
 * WARNING: This permanently removes all view state (camera positions, zoom levels, etc.).
 */
export const clearNetworkViewsFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.clear()
  })
}

// ============================================================================
// UI State Management
// ============================================================================

/**
 * Default ID for the single UI state record stored in the database.
 * Only one UI state is maintained at a time.
 */
export const DEFAULT_UI_STATE_ID = 'uistate'

/**
 * Retrieves the current UI state from IndexedDB.
 *
 * @returns Promise resolving to Ui object or undefined if no state exists
 */
export const getUiStateFromDb = async (): Promise<Ui | undefined> => {
  const uiState = await db.uiState.get({ id: DEFAULT_UI_STATE_ID })
  if (uiState !== undefined) {
    return uiState
  } else {
    return undefined
  }
}

/**
 * Persists the UI state to IndexedDB.
 *
 * @param uiState - Ui object to store
 * @throws Error if the database operation fails
 */
export const putUiStateToDb = async (uiState: Ui): Promise<void> => {
  try {
    await db.transaction('rw', db.uiState, async () => {
      await db.uiState.put({ id: DEFAULT_UI_STATE_ID, ...uiState })
    })
  } catch (e) {
    logDb.error('[putUiStateToDb] error:', e, uiState)
    throw e
  }
}

/**
 * Deletes the UI state from IndexedDB.
 */
export const deleteUiStateFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.uiState, async () => {
    await db.uiState.delete(DEFAULT_UI_STATE_ID)
  })
}

/**
 * Default ID for the single timestamp record stored in the database.
 * Used to track the last update time for synchronization purposes.
 */
export const DEFAULT_TIMESTAMP_ID = 'timestamp'

/**
 * Retrieves the stored timestamp from IndexedDB.
 *
 * @returns Promise resolving to timestamp number or undefined if not set
 */
export const getTimestampFromDb = async (): Promise<number | undefined> => {
  const ts = await db.timestamp.get({ id: DEFAULT_TIMESTAMP_ID })
  if (ts !== undefined) {
    return ts.timestamp
  } else {
    return undefined
  }
}

/**
 * Persists a timestamp to IndexedDB.
 *
 * @param ts - Timestamp value (typically milliseconds since epoch)
 * @throws Error if the database operation fails
 */
export const putTimestampToDb = async (ts: number): Promise<void> => {
  try {
    await db.transaction('rw', db.timestamp, async () => {
      await db.timestamp.put({ id: DEFAULT_TIMESTAMP_ID, timestamp: ts })
    })
  } catch (e) {
    logDb.error('[putTimestampToDb] error:', e, ts)
    throw e
  }
}

/**
 * Persists filter configuration to IndexedDB.
 *
 * The filter's name is used as the primary key.
 *
 * @param filterConfig - FilterConfig object to store
 * @throws Error if the database operation fails
 */
export const putFilterToDb = async (
  filterConfig: FilterConfig,
): Promise<void> => {
  try {
    const serializedFilterConfig = serializeFilterConfig(filterConfig)
    await db.transaction('rw', db.filters, async () => {
      await db.filters.put({ id: filterConfig.name, ...serializedFilterConfig })
    })
  } catch (e) {
    logDb.error('[putFilterToDb] error:', e, filterConfig)
    throw e
  }
}

/**
 * Retrieves a filter configuration by name.
 *
 * @param filterName - Name of the filter to retrieve
 * @returns Promise resolving to FilterConfig or undefined if not found
 */
export const getFilterFromDb = async (
  filterName: string,
): Promise<FilterConfig | undefined> => {
  const filterConfig = await db.filters.get({ id: filterName })
  if (filterConfig === undefined) {
    return undefined
  }
  return deserializeFilterConfig(filterConfig)
}

/**
 * Deletes a filter configuration from IndexedDB.
 *
 * @param filterName - Name of the filter to delete
 */
export const deleteFilterFromDb = async (filterName: string): Promise<void> => {
  await db.transaction('rw', db.filters, async () => {
    await db.filters.delete(filterName)
  })
}

// ============================================================================
// Application Metadata Management
// ============================================================================

/**
 * Persists a CyApp (Cytoscape App) metadata to IndexedDB.
 *
 * @param app - CyApp object to store
 * @throws Error if the database operation fails
 */
export const putAppToDb = async (app: CyApp): Promise<void> => {
  try {
    await db.transaction('rw', db.apps, async () => {
      await db.apps.put(app)
    })
  } catch (e) {
    logDb.error('[putAppToDb] error:', e, app)
    throw e
  }
}

/**
 * Retrieves a CyApp by its ID.
 *
 * @param appId - Application ID
 * @returns Promise resolving to CyApp or undefined if not found
 */
export const getAppFromDb = async (
  appId: string,
): Promise<CyApp | undefined> => {
  return await db.apps.get({ id: appId })
}

/**
 * Deletes a CyApp from IndexedDB.
 *
 * @param appId - Application ID to delete
 */
export const deleteAppFromDb = async (appId: string): Promise<void> => {
  await db.transaction('rw', db.apps, async () => {
    await db.apps.delete(appId)
  })
}

// ============================================================================
// Service Apps Management
// ============================================================================
// Service apps are external applications that can be invoked from Cytoscape Web.
// The primary key is the service URL, not an ID.

/**
 * Persists a ServiceApp to IndexedDB.
 *
 * The service app's URL is used as the primary key.
 *
 * @param serviceApp - ServiceApp object to store
 * @throws Error if the database operation fails
 */
export const putServiceAppToDb = async (
  serviceApp: ServiceApp,
): Promise<void> => {
  try {
    await db.transaction('rw', db.serviceApps, async () => {
      await db.serviceApps.put(serviceApp)
    })
  } catch (e) {
    logDb.error('[putServiceAppToDb] error:', e, serviceApp)
    throw e
  }
}

/**
 * Retrieves all service apps from IndexedDB.
 *
 * @returns Promise resolving to array of ServiceApp objects (empty array on error)
 */
export const getAllServiceAppsFromDb = async (): Promise<ServiceApp[]> => {
  try {
    // Fetch all entries as an array
    const serviceList: ServiceApp[] = await db.serviceApps.toArray()
    return serviceList
  } catch (err) {
    logDb.warn(
      '[getAllServiceAppsFromDb] Failed to open DB or fetch data',
      err,
      db.serviceApps,
    )
    return []
  }
}

/**
 * Deletes a service app by its URL.
 *
 * @param url - Service app URL (used as primary key)
 */
export const deleteServiceAppFromDb = async (url: string): Promise<void> => {
  await db.transaction('rw', db.serviceApps, async () => {
    await db.serviceApps.delete(url)
  })
}

// ============================================================================
// Opaque Aspects Management
// ============================================================================
// Opaque aspects store CX2 format extensions and other network metadata
// that doesn't fit into the standard data model. These are stored as
// key-value pairs where values are arrays of aspect objects.

/**
 * Database representation of opaque aspects for a network.
 *
 * Opaque aspects are CX2 format extensions stored as a dictionary where:
 * - Keys are aspect names (e.g., 'cyHiddenAttributes', 'cyGroups')
 * - Values are arrays of aspect objects
 */
export interface OpaqueAspectsDB {
  id: IdType
  aspects: Record<string, any[]>
}

/**
 * Persists opaque aspects for a network.
 *
 * @param networkId - Network ID to associate the aspects with
 * @param aspects - Dictionary of aspect names to arrays of aspect objects
 * @throws Error if the database operation fails
 */
export const putOpaqueAspectsToDb = async (
  networkId: IdType,
  aspects: Record<string, any[]>,
): Promise<void> => {
  try {
    await db.transaction('rw', db.opaqueAspects, async () => {
      await db.opaqueAspects.put({ id: networkId, aspects })
    })
  } catch (e) {
    logDb.error('[putOpaqueAspectsToDb] error:', e, networkId, aspects)
    throw e
  }
}

/**
 * Retrieves opaque aspects for a network.
 *
 * @param networkId - Network ID
 * @returns Promise resolving to OpaqueAspectsDB or undefined if not found
 */
export const getOpaqueAspectsFromDb = async (
  networkId: IdType,
): Promise<OpaqueAspectsDB | undefined> => {
  return await db.opaqueAspects.get({ id: networkId })
}

/**
 * Deletes opaque aspects for a network.
 *
 * @param networkId - Network ID whose aspects should be deleted
 */
export const deleteOpaqueAspectsFromDb = async (
  networkId: IdType,
): Promise<void> => {
  await db.opaqueAspects.delete(networkId)
}

/**
 * Deletes all opaque aspects from the database.
 *
 * WARNING: This permanently removes all CX2 extension data.
 */
export const clearOpaqueAspectsFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.opaqueAspects, async () => {
    await db.opaqueAspects.clear()
  })
}

// ============================================================================
// Undo/Redo Stack Management
// ============================================================================

/**
 * Database representation of an undo/redo stack for a network.
 *
 * Stores the history of network edits to support undo/redo functionality.
 */
export interface UndoRedoStackDB {
  id: IdType
  undoRedoStack: UndoRedoStack
}

/**
 * Represents cached network data retrieved from IndexedDB.
 *
 * All fields are optional because data may be partially cached or missing.
 * This type aggregates all network-related data from the database cache.
 */
export interface CachedNetworkData {
  network?: Network
  nodeTable?: Table
  edgeTable?: Table
  visualStyle?: VisualStyle
  networkViews?: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[]
  undoRedoStack?: UndoRedoStack
}

/**
 * Persists an undo/redo stack for a network.
 *
 * @param networkId - Network ID to associate the stack with
 * @param undoRedoStack - UndoRedoStack object containing undo and redo stacks
 * @throws Error if the database operation fails
 */
export const putUndoRedoStackToDb = async (
  networkId: IdType,
  undoRedoStack: UndoRedoStack,
): Promise<void> => {
  try {
    await db.transaction('rw', db.undoStacks, async () => {
      await db.undoStacks.put({ id: networkId, undoRedoStack })
    })
  } catch (e) {
    logDb.error('[putUndoRedoStackToDb] error:', e, networkId, undoRedoStack)
    throw e
  }
}

/**
 * Retrieves the undo/redo stack for a network.
 *
 * @param networkId - Network ID
 * @returns Promise resolving to UndoRedoStackDB or undefined if not found
 */
export const getUndoRedoStackFromDb = async (
  networkId: IdType,
): Promise<UndoRedoStackDB | undefined> => {
  const result = await db.undoStacks.get({ id: networkId })
  return result
}

/**
 * Deletes the undo/redo stack for a network.
 *
 * @param networkId - Network ID whose stack should be deleted
 */
export const deleteUndoRedoStackFromDb = async (
  networkId: IdType,
): Promise<void> => {
  await db.undoStacks.delete(networkId)
}

/**
 * Deletes all undo/redo stacks from the database.
 *
 * WARNING: This permanently removes all edit history for all networks.
 */
export const clearUndoRedoStackFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.undoStacks, async () => {
    await db.undoStacks.clear()
  })
}

/**
 * Retrieves a CyNetwork from IndexedDB.
 *
 * Attempts to load all network-related data from the cache, including:
 * - Network structure
 * - Tables (node and edge)
 * - Network views
 * - Visual styles and style options
 * - Opaque aspects
 * - Undo/redo stack
 *
 * @param id - Network ID to retrieve from cache
 * @returns Promise resolving to CyNetwork object
 * @throws Error if data retrieval fails or required fields are missing
 */
export const getCyNetworkFromDb = async (id: string): Promise<CyNetwork> => {
  try {
    const network = await getNetworkFromDb(id)
    const tables = await getTablesFromDb(id)
    const networkViewsEntry = await db.cyNetworkViews.get({ id })
    const networkViews: NetworkView[] | undefined = networkViewsEntry
      ? networkViewsEntry.views.map((v: any) => deserializeNetworkView(v))
      : undefined
    const visualStyle = await getVisualStyleFromDb(id)
    const uiState: Ui | undefined = await getUiStateFromDb()
    const vsOptions: Record<IdType, VisualStyleOptions> =
      uiState?.visualStyleOptions ?? {}
    // Fall back to an empty object if the visual style options are not found
    const visualStyleOptions: VisualStyleOptions = vsOptions[id] ?? {}
    const opaqueAspects: OpaqueAspectsDB | undefined =
      await getOpaqueAspectsFromDb(id)
    // Convert the database format (Record<string, any[]>) to OpaqueAspects format
    // (array of objects with single key-value pairs)
    const otherAspects: OpaqueAspects[] = opaqueAspects
      ? Object.entries(opaqueAspects.aspects).map(([key, value]) => ({
          [key]: value,
        }))
      : []

    const undoStackDbResult = await getUndoRedoStackFromDb(id)

    const undoRedoStack = undoStackDbResult?.undoRedoStack ?? {
      undoStack: [],
      redoStack: [],
    }

    // Ensure all required fields are present
    if (!network) {
      throw new Error(`Network not found for id: ${id}`)
    }
    if (!tables || !tables.nodeTable || !tables.edgeTable) {
      throw new Error(`Tables not found for id: ${id}`)
    }
    if (!visualStyle) {
      throw new Error(`Visual style not found for id: ${id}`)
    }
    if (!networkViews) {
      throw new Error(`Network views not found for id: ${id}`)
    }

    return {
      network,
      nodeTable: tables.nodeTable,
      edgeTable: tables.edgeTable,
      visualStyle,
      networkViews: networkViews,
      visualStyleOptions: visualStyleOptions,
      otherAspects: otherAspects,
      undoRedoStack: undoRedoStack,
    }
  } catch (e) {
    logDb.error(
      `[${getCyNetworkFromDb.name}]:[${id}]: Failed to restore data from IndexedDB for network ${id} ${e}`,
    )
    throw e
  }
}
