import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import 'dexie-observable'

import config from '../../assets/config.json'

import { IdType } from '../../models/IdType'
import NetworkFn, { Node, Edge, Network } from '../../models/NetworkModel'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { Table } from '../../models/TableModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { Workspace } from '../../models/WorkspaceModel'
import { NetworkView } from '../../models/ViewModel'
import { Ui } from '../../models/UiModel'
import { applyMigrations } from './migrations'
import { getNetworkViewId } from '../ViewModelStore'
import { FilterConfig } from '../../models/FilterModel/FilterConfig'
import { CyApp } from '../../models/AppModel/CyApp'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { UndoRedoStack } from '../../models/StoreModel/UndoStoreModel'
import { createWorkspace } from '../../models/WorkspaceModel/impl/WorkspaceImpl'

import _ from 'lodash'

import { logDb } from '../../debug'

import {
  serializeVisualStyle,
  deserializeVisualStyle,
  serializeNetworkView,
  deserializeNetworkView,
  serializeTable,
  deserializeTable,
} from './db-util'
// Unique, fixed DB name for the Cytoscape Web
const DB_NAME: string = 'cyweb-db'

// Current version of the DB (integer only).
// If older version is found, the migration
// function will upgrade the existing data to this version.
const currentVersion: number = 7

/**
 * Predefined object store names.
 * Once this is updated, the upgrade / migration is needed
 *
 * If you need to add a new object store, you need to add the name here
 *
 * */
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

// The type derived from the names of object stores
export type ObjectStoreNames =
  (typeof ObjectStoreNames)[keyof typeof ObjectStoreNames]

/**
 * Object stores (for V3).
 *
 * This defines the primary key for each object store.
 *
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
 * DB will be initialized to the current version.
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

    // This will be applied only when the DB is created and should not be
    // called multiple times
    applyMigrations(this, currentVersion).catch((err) =>
      logDb.error('[applyMigrations] Failed to apply migrations', err),
    )
  }
}

// Initialize the DB
let db: CyDB
try {
  db = new CyDB(DB_NAME)
} catch (err) {
  logDb.error('[initializeDb] Failed to create Dixie instance', err)
  throw err
}

export const initializeDb = async (): Promise<void> => {
  await db.open()
  logDb.info('[initializeDb] IndexedDB is opened')

  // Check all object stores are available
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
    window.debug.db = db
  }
}

export const getDatabaseVersion = (): number => {
  return db.verno
}

export const getDb = async (): Promise<CyDB> => {
  return await Promise.resolve(db)
}

export const closeDb = async (): Promise<void> => {
  await db.close()
}

/**
 * Delete the current DB and create a new one
 *
 * - This should create the completely new DB with no data.
 *
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
export const getAllNetworkKeys = async (): Promise<IdType[]> => {
  return (await db.cyNetworks.toCollection().primaryKeys()) as IdType[]
}
/**
 *
 * Persist network to indexedDB
 *
 * @param network Network object
 * @returns
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

export const getNetworkFromDb = async (
  id: IdType,
): Promise<Network | undefined> => {
  const network: Network | undefined = await db.cyNetworks.get({ id })
  if (network !== undefined) {
    return NetworkFn.plainNetwork2CyNetwork(network)
  }
}

export const deleteNetworkFromDb = async (id: IdType): Promise<void> => {
  await db
    .transaction('rw', db.cyNetworks, async () => {
      await db.cyNetworks.delete(id)
    })
    .catch((err) => {
      logDb.error('[deleteNetworkFromDb] error:', err)
    })
}

export const clearNetworksFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyNetworks, async () => {
    await db.cyNetworks.clear()
  })
}

export const getTablesFromDb = async (id: IdType): Promise<any> => {
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
 *
 * @param id associated with the network
 * @param nodeTable node table
 * @param nodeTable edge table
 * @returns
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

export const deleteTablesFromDb = async (id: IdType): Promise<void> => {
  await db.cyTables.delete(id)
}

export const clearTablesFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyTables, async () => {
    await db.cyTables.clear()
  })
}

// Workspace management

export const putWorkspaceToDb = async (workspace: Workspace): Promise<void> => {
  try {
    await db.workspace.put({ ...workspace })
  } catch (e) {
    logDb.error('[putWorkspaceToDb] error:', e, workspace)
    throw e
  }
}

export const updateWorkspaceDb = async (
  id: IdType,
  value: Record<string, any>,
): Promise<IndexableType> => {
  return await db.workspace.update(id, value)
}

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

      // TODO: pick the newest one in production
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

// Network Summaries. For now, it is NDEx Summary

export const getNetworkSummaryFromDb = async (
  externalId: IdType,
): Promise<NdexNetworkSummary | undefined> => {
  return await db.summaries.get({ externalId })
}

export const getNetworkSummariesFromDb = async (
  externalIds: IdType[],
): Promise<NdexNetworkSummary[]> => {
  return await db.summaries.bulkGet(externalIds)
}

export const putNetworkSummaryToDb = async (
  summary: NdexNetworkSummary,
): Promise<void> => {
  try {
    // ExternalId will be used as the primary key
    await db.summaries.put({ ...summary })
  } catch (e) {
    logDb.error('[putNetworkSummaryToDb] error:', e, summary)
    throw e
  }
}

export const deleteNetworkSummaryFromDb = async (
  externalId: IdType,
): Promise<void> => {
  await db.summaries.delete(externalId)
}

export const clearNetworkSummaryFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.summaries, async () => {
    await db.summaries.clear()
  })
}

// Visual Sytles
interface VisualStyleWithId {
  id: IdType
  visualStyle: VisualStyle
}

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

export const putVisualStyleToDb = async (
  id: IdType,
  visualStyle: VisualStyle,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyVisualStyles, async () => {
      // Need to add ID because it does not have one
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

export const deleteVisualStyleFromDb = async (id: IdType): Promise<void> => {
  await db.cyVisualStyles.delete(id)
}

export const clearVisualStyleFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyVisualStyles, async () => {
    await db.cyVisualStyles.clear()
  })
}

//
// Functions for Network Views
//
// Now the multiple views are supported
//

/**
 * Get all network views for the given network ID
 * @param id Network ID
 * @returns NetworkView[] | undefined
 *
 **/
export const getNetworkViewsFromDb = async (
  id: IdType,
): Promise<NetworkView[] | undefined> => {
  const entry = await db.cyNetworkViews.get({ id })
  return entry?.views.map((v: any) =>
    deserializeNetworkView(v),
  ) as NetworkView[]
}

/**
 * Add a new network view to the DB
 *
 * @param id Network model ID
 * @param view Network View to be added
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

      const networkViews = await db.cyNetworkViews.get({ id })
      if (networkViews !== undefined) {
        const viewList: NetworkView[] = networkViews.views
        // Add only if the view does not exist

        let found = false
        viewList.forEach((v: NetworkView, idx: number) => {
          const key1 = v.viewId
          const key2 = view.viewId
          if (key1 === key2) {
            viewList[idx] = view
            found = true
          }
        })

        if (!found) {
          if (view.viewId === undefined) {
            view.viewId = getNetworkViewId(view, viewList)
          }
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
 *
 * Update multiple network views to the DB at once
 *
 * @param id Network model ID
 * @param views Network Views to be updated
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
 * Delete a network view from the DB
 *
 * @param id Network model ID
 * @param viewId Network View ID to be deleted
 */
export const deleteNetworkViewFromDb = async (
  id: IdType,
  viewId: IdType,
): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    // TODO: delete only one view
    // await db.cyNetworkViews.delete(id)
  })
}

/**
 * Delete all network views from the DB for the given network ID
 */
export const deleteNetworkViewsFromDb = async (id: IdType): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.delete(id)
  })
}

/**
 * Delete all network views from the DB for the given network ID
 */
export const clearNetworkViewsFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.clear()
  })
}

// UI State
export const DEFAULT_UI_STATE_ID = 'uistate'
export const getUiStateFromDb = async (): Promise<Ui | undefined> => {
  const uiState = await db.uiState.get({ id: DEFAULT_UI_STATE_ID })
  if (uiState !== undefined) {
    return uiState
  } else {
    return undefined
  }
}

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

export const deleteUiStateFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.uiState, async () => {
    await db.uiState.delete(DEFAULT_UI_STATE_ID)
  })
}

export const DEFAULT_TIMESTAMP_ID = 'timestamp'
export const getTimestampFromDb = async (): Promise<number | undefined> => {
  const ts = await db.timestamp.get({ id: DEFAULT_TIMESTAMP_ID })
  if (ts !== undefined) {
    return ts.timestamp
  } else {
    return undefined
  }
}

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
 * Store filter settings to the DB
 *
 * @param filterConfig
 */
export const putFilterToDb = async (
  filterConfig: FilterConfig,
): Promise<void> => {
  try {
    await db.transaction('rw', db.filters, async () => {
      await db.filters.put({ id: filterConfig.name, ...filterConfig })
    })
  } catch (e) {
    logDb.error('[putFilterToDb] error:', e, filterConfig)
    throw e
  }
}

/**
 * Get filter settings from the DB
 */
export const getFilterFromDb = async (
  filterName: string,
): Promise<FilterConfig | undefined> => {
  return await db.filters.get({ id: filterName })
}

/**
 * Delete filter settings from the DB
 */
export const deleteFilterFromDb = async (filterName: string): Promise<void> => {
  await db.transaction('rw', db.filters, async () => {
    await db.filters.delete(filterName)
  })
}

/**
 * Store CyApps metadata to DB
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

export const getAppFromDb = async (
  appId: string,
): Promise<CyApp | undefined> => {
  return await db.apps.get({ id: appId })
}

export const deleteAppFromDb = async (appId: string): Promise<void> => {
  await db.transaction('rw', db.apps, async () => {
    await db.apps.delete(appId)
  })
}

/**
 * Store Service App URL to DB
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

export const deleteServiceAppFromDb = async (url: string): Promise<void> => {
  // Check the db has the object store or not
  await db.transaction('rw', db.serviceApps, async () => {
    await db.serviceApps.delete(url)
  })
}

// opaque aspects
export interface OpaqueAspectsDB {
  id: IdType
  aspects: Record<string, any[]>
}

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

export const getOpaqueAspectsFromDb = async (
  networkId: IdType,
): Promise<OpaqueAspectsDB | undefined> => {
  return await db.opaqueAspects.get({ id: networkId })
}

export const deleteOpaqueAspectsFromDb = async (
  networkId: IdType,
): Promise<void> => {
  await db.opaqueAspects.delete(networkId)
}

export const clearOpaqueAspectsFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.opaqueAspects, async () => {
    await db.opaqueAspects.clear()
  })
}

export interface UndoRedoStackDB {
  id: IdType
  undoRedoStack: UndoRedoStack
}

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

export const getUndoRedoStackFromDb = async (
  networkId: IdType,
): Promise<UndoRedoStackDB | undefined> => {
  const result = await db.undoStacks.get({ id: networkId })
  return result
}

export const deleteUndoRedoStackFromDb = async (
  networkId: IdType,
): Promise<void> => {
  await db.undoStacks.delete(networkId)
}

export const clearUndoRedoStackFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.undoStacks, async () => {
    await db.undoStacks.clear()
  })
}
