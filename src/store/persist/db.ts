import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import { IdType } from '../../models/IdType'
import NetworkFn, { Node, Edge, Network } from '../../models/NetworkModel'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { Table } from '../../models/TableModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { Workspace } from '../../models/WorkspaceModel'
import { v4 as uuidv4 } from 'uuid'
import { NetworkView } from '../../models/ViewModel'
import { Ui } from '../../models/UiModel'

const DB_NAME = 'cyweb-db'
const DB_VERSION: number = 1

/**
 * TODO: we need a schema for indexes
 *  - name
 *  - n
 *  - description
 */
class CyDB extends Dexie {
  workspace!: DxTable<any>
  cyNetworks!: DxTable<Network>
  cyTables!: DxTable<any>
  cyVisualStyles!: DxTable<any>
  summaries!: DxTable<any>
  cyNetworkViews!: DxTable<any>
  uiState!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(DB_VERSION).stores({
      workspace: 'id',
      summaries: 'externalId',
      cyNetworks: 'id',
      cyTables: 'id',
      cyVisualStyles: 'id',
      cyNetworkViews: 'id',
      uiState: 'id',
    })
  }
}

// Initialize the DB
let db = new CyDB(DB_NAME)
db.open()
  .then((dexi) => {})
  .catch((err) => {
    console.log(err)
  })

db.on('ready', () => {
  console.info('Indexed DB is ready')
})

export const deleteDb = async (): Promise<void> => {
  await Dexie.delete(DB_NAME)
  db = new CyDB(DB_NAME)
}

/**
 *
 * Persist network to indexedDB
 *
 * @param network Network object
 * @returns
 */
export const putNetworkToDb = async (network: Network): Promise<void> => {
  await db.transaction('rw', db.cyNetworks, async () => {
    // Store plain network topology only
    await db.cyNetworks.put(cyNetwork2Network(network))
  })
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

/**
 *
 * Create in-memory model from local DB cache
 *
 * @param id
 * @returns
 */
export const getNetworkFromDbOld = async (
  id: IdType,
): Promise<Network | undefined> => {
  const cached: any = await db.cyNetworks.get({ id })
  if (cached !== undefined) {
    return cached
  }

  return NetworkFn.createFromCyJson(id, cached)
}

export const getNetworkFromDb = async (
  id: IdType,
): Promise<Network | undefined> => {
  const network: Network | undefined = await db.cyNetworks.get({ id })
  if (network !== undefined) {
    return NetworkFn.plainNetwork2CyNetwork(network)
  }
}

export const putNetworkToDbOld = async (network: Network): Promise<void> => {
  console.log('Updating network', network)
  await db
    .transaction('rw', db.cyNetworks, async () => {
      await db.cyNetworks.put({ ...network })
    })
    .catch((err) => {
      console.error('PUT ERROR::', err)
    })
}

export const deleteNetworkFromDb = async (id: IdType): Promise<void> => {
  await db
    .transaction('rw', db.cyNetworks, async () => {
      await db.cyNetworks.delete(id)
    })
    .catch((err) => {
      console.error('DELETE ERROR::', err)
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
    return cached
  }

  return cached
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
  await db.transaction('rw', db.cyTables, async () => {
    await db.cyTables.put({
      id,
      nodeTable,
      edgeTable,
    })
  })
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

export const putWorkspaceToDb = async (
  workspace: Workspace,
): Promise<IndexableType> => {
  return await db.workspace.put({ ...workspace })
}

export const updateWorkspaceDb = async (
  id: IdType,
  value: Record<string, any>,
): Promise<IndexableType> => {
  return await db.workspace.update(id, value)
}

export const getWorkspaceFromDb = async (id?: IdType): Promise<Workspace> => {
  // Check there is no workspace in the DB or not
  const workspaceCount: number = await db.workspace.count()

  if (id === undefined || id === '') {
    // Workspace ID is not specified
    if (workspaceCount === 0) {
      // Initialize all data
      const newWs: Workspace = createWorkspace()
      await db.transaction('rw', db.workspace, async () => {
        await putWorkspaceToDb(newWs)
        console.info('New workspace created')
      })
      return newWs
    } else {
      // There is a workspace in the DB
      const allWS: Workspace[] = await db.workspace.toArray()

      // TODO: pick the newest one in the production
      const lastWs: Workspace = allWS[0]
      console.info('Last workspace loaded from DB', lastWs)
      return lastWs
    }
  }

  // Workspace ID is specified

  const cachedWorkspace: Workspace = await db.workspace.get(id)
  if (cachedWorkspace !== undefined) {
    return cachedWorkspace
  } else {
    if (workspaceCount === 0) {
      const newWs: Workspace = createWorkspace()
      await putWorkspaceToDb(newWs)
      return newWs
    } else {
      // There is a workspace in the DB
      const allWS: Workspace[] = await db.workspace.toArray()
      const lastWs: Workspace = allWS[0]
      console.info('Use the last workspace from DB', lastWs)
      return lastWs
    }
  }
}

// const DEF_WORKSPACE_ID = 'newWorkspace'
const DEF_WORKSPACE_NAME = 'New Workspace'

const createWorkspace = (): Workspace => {
  return {
    id: uuidv4(),
    name: DEF_WORKSPACE_NAME,
    networkIds: [],
    networkModified: {},
    creationTime: new Date(),
    localModificationTime: new Date(),
    currentNetworkId: '',
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
): Promise<IndexableType> => {
  // ExternalId will be used as the primary key
  return await db.summaries.put({ ...summary })
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
    return vsId.visualStyle
  } else {
    return undefined
  }
}

export const putVisualStyleToDb = async (
  id: IdType,
  visualStyle: VisualStyle,
): Promise<void> => {
  await db.transaction('rw', db.cyVisualStyles, async () => {
    // Need to add ID because it does not have one
    return await db.cyVisualStyles.put({
      id,
      visualStyle,
    })
  })
}

export const deleteVisualStyleFromDb = async (id: IdType): Promise<void> => {
  await db.cyVisualStyles.delete(id)
}

export const clearVisualStyleFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyVisualStyles, async () => {
    await db.cyVisualStyles.clear()
  })
}

// Network View
export const getNetworkViewFromDb = async (
  id: IdType,
): Promise<NetworkView | undefined> => {
  return await db.cyNetworkViews.get({ id })
}

export const putNetworkViewToDb = async (
  id: IdType,
  view: NetworkView,
): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.put({ ...view })
  })
}

export const deleteNetworkViewFromDb = async (id: IdType): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.delete(id)
  })
}

export const clearNetworkViewFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.cyNetworkViews, async () => {
    await db.cyNetworkViews.clear()
  })
}

// UI State
export const DEFAULT_UI_STATE_ID = 'uistate'
export const getUiStateFromDb = async (): Promise<Ui | undefined> => {
  const uiState = await db.uiState.get({ id: DEFAULT_UI_STATE_ID })
  console.log(uiState, 'ui')
  if (uiState !== undefined) {
    return uiState
  } else {
    return undefined
  }
}

export const putUiStateToDb = async (uiState: Ui): Promise<void> => {
  console.log(uiState, 'saving ui state')

  await db.transaction('rw', db.uiState, async () => {
    await db.uiState.put({ id: DEFAULT_UI_STATE_ID, ...uiState })
  })
}

export const deleteUiStateFromDb = async (): Promise<void> => {
  await db.transaction('rw', db.uiState, async () => {
    await db.uiState.delete(DEFAULT_UI_STATE_ID)
  })
}
