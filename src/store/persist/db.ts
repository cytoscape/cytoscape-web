import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import { IdType } from '../../models/IdType'
import NetworkFn, { Network } from '../../models/NetworkModel'

const DB_NAME = 'cyweb-db'

/**
 * TODO: we need a schema for indexes
 *  - name
 *  - n
 *  - description
 */
class CyDB extends Dexie {
  cyNetworks!: DxTable<any>
  cyTables!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(1).stores({
      cyNetworks: 'id',
      cyTables: 'id',
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
  network: Network,
): Promise<IndexableType> => {
  const cyJs: any = NetworkFn.createCyJSON(network)
  const minimalCyjs = {
    id: network.id,
    elements: cyJs.elements,
    data: cyJs.data,
  }

  minimalCyjs.data.id = network.id
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

export const deleteNetworkFromDb = async (id: IdType): Promise<void> => {
  await db.cyNetworks.delete(id)
}

/**
 *
 * @param id associated with the network
 * @param network network object containing tables
 * @returns
 */
export const addTables = async (network: Network): Promise<IndexableType> => {
  return await db.cyTables.put({
    id: network.id,
    nodeTable: NetworkFn.nodeTable(network),
    edgeTable: NetworkFn.edgeTable(network),
  })
}
