import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import NetworkFn, { Network, Node, Edge } from '../../models/NetworkModel'

/**
 * TODO: we need a schema for indexes
 *  - name
 *  - n
 *  - description
 */
export class CyDB extends Dexie {
  cyNetworks!: DxTable<any>
  cyTables!: DxTable<any>

  constructor(dbName: string) {
    super(dbName)
    this.version(1).stores({
      cyNetworks: '++id, name, description',
      cyTables: '++id, n',
    })
  }
}

export const db = new CyDB('cyDB')

export const addNetwork = async (network: Network): Promise<IndexableType> => {
  const nodes: Node[] = NetworkFn.nodes(network)
  const edges: Edge[] = NetworkFn.edges(network)

  return await db.cyNetworks.add({
    id: network.id,
    nodes,
    edges,
  })
}
