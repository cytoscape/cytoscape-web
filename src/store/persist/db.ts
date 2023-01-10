import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import { IdType } from '../../models/IdType'
import NetworkFn, { Network } from '../../models/NetworkModel'
import { Table } from '../../models/TableModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { Workspace } from '../../models/WorkspaceModel'

const DB_NAME = 'cyweb-db'

/**
 * TODO: we need a schema for indexes
 *  - name
 *  - n
 *  - description
 */
class CyDB extends Dexie {
  workspace!: DxTable<any>
  cyNetworks!: DxTable<any>
  cyTables!: DxTable<any>
  cyVisualStyles!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(1).stores({
      workspace: 'id',
      cyNetworks: 'id',
      cyTables: 'id',
      cyVisualStyles: 'id',
    })
  }
}

const db = new CyDB(DB_NAME)

export const deleteDb = async (): Promise<void> => {
  await Dexie.delete(DB_NAME)
}

/**
 *
 * Persist network to indexedDB
 *
 * @param network Network object
 * @returns
 */
export const putNetworkToDb = async (
  id: IdType,
  network: Network,
): Promise<IndexableType> => {
  const cyJs: any = NetworkFn.createCyJSON(network)
  const minimalCyjs = {
    id,
    elements: cyJs.elements,
    data: cyJs.data,
  }

  minimalCyjs.data.id = id
  return await db.cyNetworks.put(minimalCyjs)
}

/**
 *
 * Create in-memory model from local DB cache
 *
 * @param id
 * @returns
 */
export const getNetworkFromDb = async (
  id: IdType,
): Promise<Network | undefined> => {
  const cached: any = await db.cyNetworks.get({ id })
  if (cached === undefined) {
    return cached
  }

  return NetworkFn.createFromCyJson(id, cached)
}

export const getVisualStyleFromDb = async (
  id: IdType,
): Promise<VisualStyle | undefined> => {
  const cached: any = await db.cyVisualStyles.get({ id })
  if (cached === undefined) {
    return cached
  }
  return cached.visualStyle
}

export const getTablesFromDb = async (id: IdType): Promise<any> => {
  const cached: any = await db.cyTables.get({ id })
  if (cached === undefined) {
    return cached
  }

  return cached
}

export const deleteNetworkFromDb = async (id: IdType): Promise<void> => {
  await db.cyNetworks.delete(id)
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
): Promise<IndexableType> => {
  return await db.cyTables.put({
    id,
    nodeTable,
    edgeTable,
  })
}

export const putVisualStylesToDb = async (
  id: IdType,
  visualStyle: VisualStyle,
): Promise<IndexableType> => {
  return await db.cyVisualStyles.put({
    id,
    visualStyle,
  })
}

export const putWorkspaceToDb = async (
  workspace: Workspace,
): Promise<IndexableType> => {
  return await db.workspace.put({ id: workspace.id, workspace })
}

export const getWorkspaceFromDb = async (id?: IdType): Promise<Workspace> => {
  if (id === undefined) {
    const newWs: Workspace = createWorkspace()
    await putWorkspaceToDb(newWs)
    return newWs
  }

  const cachedWorkspace: any = await db.workspace.get({ id })
  if (cachedWorkspace !== undefined) {
    return cachedWorkspace
  } else {
    const newWs: Workspace = createWorkspace()
    await putWorkspaceToDb(newWs)
    return newWs
  }
}

const DEF_WORKSPACE_ID = 'newWorkspace'
const DEF_WORKSPACE_NAME = 'New Workspace'

const createWorkspace = (): Workspace => {
  return {
    id: DEF_WORKSPACE_ID as IdType,
    name: DEF_WORKSPACE_NAME,
    networkIds: [],
    creationTime: new Date(),
    currentNetworkId: '',
  }
}
