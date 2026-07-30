import 'dexie-observable'

import Dexie, { IndexableType, Table as DxTable } from 'dexie'

import { logDb, registerDebugTool } from '../../debug'
import { CyApp } from '../../models/AppModel/CyApp'
import { ServiceApp } from '../../models/AppModel/ServiceApp'
import { CyNetwork } from '../../models/CyNetworkModel'
import { FilterConfig } from '../../models/FilterModel/FilterConfig'
import { IdType } from '../../models/IdType'
import NetworkFn, { Edge, Network, Node } from '../../models/NetworkModel'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { UndoRedoStack } from '../../models/StoreModel/UndoStoreModel'
import { Table } from '../../models/TableModel'
import { Ui } from '../../models/UiModel'
import { NetworkView } from '../../models/ViewModel'
import {
  StyleTemplate,
  VisualStyle,
  VisualStyleSet,
} from '../../models/VisualStyleModel'
import {
  createStyleSet,
  isValidStyleSet,
} from '../../models/VisualStyleModel/impl/visualStyleSetImpl'
import { DEFAULT_STYLE_NAME } from '../../models/VisualStyleModel/VisualStyleSet'
import { VisualStyleOptions } from '../../models/VisualStyleModel/VisualStyleOptions'
import { Workspace } from '../../models/WorkspaceModel'
import { createWorkspace } from '../../models/WorkspaceModel/impl/workspaceImpl'
import { getNetworkViewId } from '../hooks/stores/ViewModelStore'
import { registerMigrations } from './migrations'
import { toPlainObject } from './serialization'
import { decodeRichValues, encodeRichValues } from './serialization/richValues'
import {
  validateCyApp,
  validateNetwork,
  validateNetworkSummary,
  validateNetworkView,
  validateOpaqueAspectsDb,
  validateServiceApp,
  validateStoredUiState,
  validateTable,
  validateUndoRedoStackDb,
  validateVisualStyle,
  validateWorkspace,
} from './validator'
import {
  deserializeFilterConfig,
  deserializeNetworkView,
  deserializeTable,
  deserializeVisualStyle,
  serializeFilterConfig,
  serializeNetworkView,
  serializeTable,
  serializeVisualStyle,
} from './serialization/mapSerialization'
// Unique, fixed DB name for the Cytoscape Web
export const DB_NAME: string = 'cyweb-db'

// Current version of the DB (integer only).
// If older version is found, the migration
// function will upgrade the existing data to this version.
export const currentVersion: number = 10

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

  // From v9
  AppSettings: 'appSettings',

  // From v10: workspace-level visual style template library
  StyleLibrary: 'cyStyleLibrary',
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

  [ObjectStoreNames.AppSettings]: 'key',

  [ObjectStoreNames.StyleLibrary]: 'id',
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

  [ObjectStoreNames.UndoStacks]!: DxTable<any>;

  // From v9
  [ObjectStoreNames.AppSettings]!: DxTable<any>;

  // From v10
  [ObjectStoreNames.StyleLibrary]!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(currentVersion).stores(Keys)

    // Register upgrade functions before open(); Dexie decides at open time
    // which ones the on-disk version needs
    try {
      registerMigrations(this)
    } catch (err) {
      logDb.error('[registerMigrations] Failed to register migrations', err)
    }
  }
}

/**
 * Observe-mode validation for IndexedDB reads (REVIEW.md round-1 P0,
 * wired in round 7). Runs the model-shape validator against data read
 * from the DB and logs a warning on mismatch — it NEVER alters or
 * rejects the data, so corrupt or old-shape rows cannot brick a
 * workspace. Escalate to enforcement only once field warnings are quiet.
 */
const observeValidation = <T>(
  label: string,
  value: T,
  validate: (value: unknown) => unknown,
): T => {
  if (value === undefined || value === null) {
    return value
  }
  try {
    validate(value)
  } catch (e) {
    logDb.warn(`[db] Read-path validation failed for ${label}:`, e)
  }
  return value
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

  registerDebugTool('db', db)
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
    observeValidation(`network ${id}`, network, validateNetwork)
    return NetworkFn.networkModelToImplNetwork(network)
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
    nodeTable: observeValidation(
      `node table ${id}`,
      deserializeTable(cached.nodeTable),
      validateTable,
    ),
    edgeTable: observeValidation(
      `edge table ${id}`,
      deserializeTable(cached.edgeTable),
      validateTable,
    ),
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
      return observeValidation(`workspace ${lastWs.id}`, lastWs, validateWorkspace)
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
    return observeValidation(
      `workspace ${id}`,
      cachedWorkspace,
      validateWorkspace,
    )
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
      return observeValidation(`workspace ${lastWs.id}`, lastWs, validateWorkspace)
    }
  }
}

// Network Summaries. For now, it is NDEx Summary

export const getNetworkSummaryFromDb = async (
  externalId: IdType,
): Promise<NetworkSummary | undefined> => {
  const summary = await db.summaries.get({ externalId })
  return observeValidation(
    `network summary ${externalId}`,
    summary,
    validateNetworkSummary,
  )
}

export const getNetworkSummariesFromDb = async (
  externalIds: IdType[],
): Promise<(NetworkSummary | undefined)[]> => {
  const summaries = await db.summaries.bulkGet(externalIds)
  summaries.forEach((summary) =>
    observeValidation(
      `network summary ${summary?.externalId}`,
      summary,
      validateNetworkSummary,
    ),
  )
  return summaries
}

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

// Visual Styles
//
// Since DB v10 a row holds the complete named-style set of a network:
//   { id: <networkId>, activeStyleId, styles: { [styleId]: {id, name, visualStyle} } }
// Rows written before v10 have the legacy single-style shape
//   { id: <networkId>, visualStyle }
// and are normalized on read (no Dexie data migration needed — the row is
// rewritten in the new shape on its next write).

/** Legacy (pre-v10) row shape. */
interface VisualStyleWithId {
  id: IdType
  visualStyle: VisualStyle
}

interface NamedVisualStyleRow {
  id: IdType
  name: string
  visualStyle: ReturnType<typeof serializeVisualStyle>
}

/** Current (v10+) row shape. */
interface VisualStyleSetRow {
  id: IdType
  activeStyleId: IdType
  styles: Record<IdType, NamedVisualStyleRow>
}

const isLegacyVisualStyleRow = (
  row: VisualStyleWithId | VisualStyleSetRow,
): row is VisualStyleWithId =>
  (row as VisualStyleSetRow).styles === undefined ||
  (row as VisualStyleSetRow).activeStyleId === undefined

/** Normalize any row shape into a deserialized VisualStyleSet. */
const rowToVisualStyleSet = (
  row: VisualStyleWithId | VisualStyleSetRow,
): VisualStyleSet => {
  if (isLegacyVisualStyleRow(row)) {
    return createStyleSet(
      observeValidation(
        `visual style ${row.id}`,
        deserializeVisualStyle(row.visualStyle as any),
        validateVisualStyle,
      ),
    )
  }
  return {
    activeStyleId: row.activeStyleId,
    styles: Object.fromEntries(
      Object.entries(row.styles).map(([styleId, namedStyle]) => [
        styleId,
        {
          id: namedStyle.id,
          name: namedStyle.name,
          visualStyle: observeValidation(
            `visual style ${row.id}/${styleId}`,
            deserializeVisualStyle(namedStyle.visualStyle as any),
            validateVisualStyle,
          ),
        },
      ]),
    ),
  }
}

/**
 * Get the complete visual style set of a network.
 * Legacy single-style rows are transparently wrapped as a one-entry set.
 * Corrupted rows return undefined instead of throwing so callers can fall
 * back (e.g. re-fetch the network from NDEx).
 */
export const getVisualStyleSetFromDb = async (
  id: IdType,
): Promise<VisualStyleSet | undefined> => {
  const row: VisualStyleWithId | VisualStyleSetRow | undefined =
    await db.cyVisualStyles.get({ id })
  if (row === undefined) {
    return undefined
  }
  if (isLegacyVisualStyleRow(row) && row.visualStyle === undefined) {
    logDb.error(
      `[getVisualStyleSetFromDb] Corrupted style row for network ${id}`,
    )
    return undefined
  }
  try {
    const styleSet = rowToVisualStyleSet(row)
    if (!isValidStyleSet(styleSet)) {
      logDb.error(
        `[getVisualStyleSetFromDb] Invalid style set row for network ${id}`,
      )
      return undefined
    }
    return styleSet
  } catch (e) {
    logDb.error(
      `[getVisualStyleSetFromDb] Failed to deserialize style row for network ${id}: ${e}`,
    )
    return undefined
  }
}

/**
 * Stand-in style id for a legacy (pre-v10) row.
 *
 * Such a row stores a bare style with no id of its own, and
 * getVisualStyleSetFromDb mints a FRESH uuid for it on every read — so there is
 * no id a metadata listing could hand back that would still resolve later.
 * Metadata reports this sentinel as both the entry id and the activeStyleId,
 * which makes "look the style up by id, falling back to the set's active style"
 * the correct resolution strategy for every row shape.
 */
export const LEGACY_STYLE_ID = 'legacy-default-style'

/**
 * Just the names of a network's named styles — no style content.
 */
export interface StyleSetMetadata {
  networkId: IdType
  activeStyleId: IdType
  styles: Array<{ id: IdType; name: string }>
}

/**
 * List the named styles of several networks WITHOUT deserializing any of them.
 *
 * The style picker shows every workspace network's styles, but only the current
 * network's styles are in memory — the rest are only ever loaded when their
 * network is opened. This is the cheap read that fills the gap.
 *
 * Cheap because a stored style's `name` is a plain string sitting in the row, so
 * this skips both `deserializeVisualStyle` and the zod `validateVisualStyle`
 * pass that `rowToVisualStyleSet` performs — the two expensive halves of reading
 * a style row. Deserialization is deferred to whoever actually needs content
 * (`getVisualStyleSetFromDb`), i.e. rendering a thumbnail or applying a style.
 *
 * One `bulkGet` for all ids, in a single IndexedDB transaction (same shape as
 * getNetworkSummariesFromDb). Note that IndexedDB cannot project columns, so the
 * rows still arrive whole; the saving is in not parsing them, not in transfer.
 *
 * Networks with no row — never opened, so their style exists only in the CX2 on
 * the server — are simply absent from the result rather than reported as an
 * error. Callers use that to distinguish "no styles here" from "not local yet".
 */
export const getStyleSetMetadataFromDb = async (
  ids: IdType[],
): Promise<StyleSetMetadata[]> => {
  if (ids.length === 0) {
    return []
  }
  const rows = await db.cyVisualStyles.bulkGet(ids)
  const metadata: StyleSetMetadata[] = []

  rows.forEach((row: VisualStyleWithId | VisualStyleSetRow | undefined, i) => {
    if (row === undefined) {
      return
    }
    if (isLegacyVisualStyleRow(row)) {
      // Pre-v10 rows hold a single unnamed style; getVisualStyleSetFromDb
      // presents it as "Default" and so must this, or the picker would show a
      // different name than the one that appears after the row is rewritten.
      metadata.push({
        networkId: ids[i],
        activeStyleId: LEGACY_STYLE_ID,
        styles: [{ id: LEGACY_STYLE_ID, name: DEFAULT_STYLE_NAME }],
      })
      return
    }
    metadata.push({
      networkId: ids[i],
      activeStyleId: row.activeStyleId,
      styles: Object.values(row.styles).map((namedStyle) => ({
        id: namedStyle.id,
        name: namedStyle.name,
      })),
    })
  })

  return metadata
}

/**
 * Store the complete visual style set of a network.
 */
export const putVisualStyleSetToDb = async (
  id: IdType,
  styleSet: VisualStyleSet,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyVisualStyles, async () => {
      const row: VisualStyleSetRow = {
        id,
        activeStyleId: styleSet.activeStyleId,
        styles: Object.fromEntries(
          Object.entries(styleSet.styles).map(([styleId, namedStyle]) => [
            styleId,
            {
              id: namedStyle.id,
              name: namedStyle.name,
              visualStyle: serializeVisualStyle(namedStyle.visualStyle),
            },
          ]),
        ),
      }
      return await db.cyVisualStyles.put(row)
    })
  } catch (e) {
    logDb.error('[putVisualStyleSetToDb] error:', e, id, styleSet)
    throw e
  }
}

/**
 * Get the ACTIVE visual style of a network.
 *
 * @deprecated Prefer getVisualStyleSetFromDb — kept for callers that only
 * care about the currently active style.
 */
export const getVisualStyleFromDb = async (
  id: IdType,
): Promise<VisualStyle | undefined> => {
  const styleSet = await getVisualStyleSetFromDb(id)
  return styleSet?.styles[styleSet.activeStyleId]?.visualStyle
}

/**
 * Update the ACTIVE visual style of a network, preserving the other named
 * styles in the row. Creates a fresh single-style set when no row exists.
 *
 * @deprecated Prefer putVisualStyleSetToDb — kept for callers that only
 * mutate the currently active style.
 */
export const putVisualStyleToDb = async (
  id: IdType,
  visualStyle: VisualStyle,
): Promise<void> => {
  try {
    const existing = await getVisualStyleSetFromDb(id)
    const styleSet: VisualStyleSet =
      existing === undefined
        ? createStyleSet(visualStyle)
        : {
            ...existing,
            styles: {
              ...existing.styles,
              [existing.activeStyleId]: {
                ...existing.styles[existing.activeStyleId],
                visualStyle,
              },
            },
          }
    await putVisualStyleSetToDb(id, styleSet)
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
// Style Library (workspace-level visual style templates, from DB v10)
//

interface StyleTemplateRow {
  id: IdType
  name: string
  visualStyle: ReturnType<typeof serializeVisualStyle>
}

export const getAllStyleTemplatesFromDb = async (): Promise<
  StyleTemplate[]
> => {
  const rows: StyleTemplateRow[] = await db.cyStyleLibrary.toArray()
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    visualStyle: deserializeVisualStyle(row.visualStyle as any),
  }))
}

export const putStyleTemplateToDb = async (
  template: StyleTemplate,
): Promise<void> => {
  try {
    await db.transaction('rw', db.cyStyleLibrary, async () => {
      const row: StyleTemplateRow = {
        id: template.id,
        name: template.name,
        visualStyle: serializeVisualStyle(template.visualStyle),
      }
      return await db.cyStyleLibrary.put(row)
    })
  } catch (e) {
    logDb.error('[putStyleTemplateToDb] error:', e, template.id)
    throw e
  }
}

export const deleteStyleTemplateFromDb = async (id: IdType): Promise<void> => {
  await db.cyStyleLibrary.delete(id)
}

export const clearStyleLibraryFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyStyleLibrary, async () => {
    await db.cyStyleLibrary.clear()
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
    observeValidation(
      `network view ${id}`,
      deserializeNetworkView(v),
      validateNetworkView,
    ),
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
      const viewList = await getNetworkViewsFromDb(id)
      if (viewList !== undefined) {
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
    return observeValidation('ui state', uiState, validateStoredUiState)
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
 * Get filter settings from the DB
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
    // Convert Immer proxy to plain object before saving to IndexedDB
    // This prevents "Cannot perform 'Object.prototype.toString' on a proxy that has been revoked" errors
    const plainApp = toPlainObject(app)
    await db.transaction('rw', db.apps, async () => {
      await db.apps.put(plainApp)
    })
  } catch (e) {
    logDb.error('[putAppToDb] error:', e, app)
    throw e
  }
}

export const getAppFromDb = async (
  appId: string,
): Promise<CyApp | undefined> => {
  const app = await db.apps.get({ id: appId })
  return observeValidation(`app ${appId}`, app, validateCyApp)
}

export const getAllAppsFromDb = async (): Promise<CyApp[]> => {
  try {
    const appList: CyApp[] = await db.apps.toArray()
    return appList
  } catch (err) {
    logDb.warn(
      '[getAllAppsFromDb] Failed to open DB or fetch data',
      err,
      db.apps,
    )
    return []
  }
}

export const deleteAppFromDb = async (appId: string): Promise<void> => {
  await db.transaction('rw', db.apps, async () => {
    await db.apps.delete(appId)
  })
}

// App Settings (key-value store for app-related settings)

export const putAppSettingToDb = async (
  key: string,
  value: any,
): Promise<void> => {
  try {
    await db.transaction('rw', db.appSettings, async () => {
      await db.appSettings.put({ key, value })
    })
  } catch (e) {
    logDb.error('[putAppSettingToDb] error:', e, key)
    throw e
  }
}

export const getAppSettingFromDb = async (key: string): Promise<any> => {
  try {
    const entry = await db.appSettings.get({ key })
    return entry?.value
  } catch (e) {
    logDb.warn(
      '[getAppSettingFromDb] Failed to read setting, returning undefined:',
      key,
      e,
    )
    return undefined
  }
}

export const deleteAppSettingFromDb = async (key: string): Promise<void> => {
  await db.transaction('rw', db.appSettings, async () => {
    await db.appSettings.delete(key)
  })
}

/**
 * Store Service App URL to DB
 */
export const putServiceAppToDb = async (
  serviceApp: ServiceApp,
): Promise<void> => {
  try {
    // Convert Immer proxy to plain object before saving to IndexedDB
    const plainServiceApp = toPlainObject(serviceApp)
    await db.transaction('rw', db.serviceApps, async () => {
      await db.serviceApps.put(plainServiceApp)
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
    serviceList.forEach((serviceApp) =>
      observeValidation(
        `service app ${serviceApp?.url}`,
        serviceApp,
        validateServiceApp,
      ),
    )
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
  const aspects = await db.opaqueAspects.get({ id: networkId })
  return observeValidation(
    `opaque aspects ${networkId}`,
    aspects,
    validateOpaqueAspectsDb,
  )
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
  visualStyleSet?: VisualStyleSet
  networkViews?: NetworkView[]
  visualStyleOptions?: VisualStyleOptions
  otherAspects?: OpaqueAspects[]
  undoRedoStack?: UndoRedoStack
}

export const putUndoRedoStackToDb = async (
  networkId: IdType,
  undoRedoStack: UndoRedoStack,
): Promise<void> => {
  try {
    await db.transaction('rw', db.undoStacks, async () => {
      // Undo params carry arbitrarily nested Maps; encode them to plain
      // objects so the row is storable on Safari IndexedDB, which cannot
      // structured-clone Maps (REVIEW.md R2-10)
      await db.undoStacks.put({
        id: networkId,
        undoRedoStack: encodeRichValues(undoRedoStack),
      })
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
  const decoded =
    result === undefined
      ? undefined
      : { ...result, undoRedoStack: decodeRichValues(result.undoRedoStack) }
  return observeValidation(
    `undo stack ${networkId}`,
    decoded,
    validateUndoRedoStackDb,
  )
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
    const visualStyleSet = await getVisualStyleSetFromDb(id)
    const visualStyle =
      visualStyleSet?.styles[visualStyleSet.activeStyleId]?.visualStyle
    const uiState: Ui | undefined = await getUiStateFromDb()
    const vsOptions: Record<IdType, VisualStyleOptions> =
      uiState?.visualStyleOptions ?? {}
    // Fall back to an empty object if the visual style options are not found
    const visualStyleOptions: VisualStyleOptions = vsOptions[id] ?? {}
    const opaqueAspects: OpaqueAspectsDB | undefined =
      await getOpaqueAspectsFromDb(id)
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
      visualStyleSet,
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

// ============================================================================
// Database Snapshot (Import/Export)
// Re-exported from ./snapshot module
// ============================================================================

export {
  type DatabaseExportMetadata,
  type DatabaseSnapshot,
  exportDatabaseSnapshot,
  exportDatabaseSnapshotToFile,
  importDatabaseSnapshot,
  importDatabaseSnapshotFromFile,
  type ImportOptions,
  type ImportResult,
} from './snapshot'

// Application state export (includes database + store states)
export {
  type ApplicationState,
  exportApplicationState,
  exportApplicationStateToFile,
  manualExportAppState,
} from './snapshot/exportApplicationState'
