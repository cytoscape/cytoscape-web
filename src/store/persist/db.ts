import Dexie, { IndexableType, Table as DxTable } from 'dexie'
import { IdType } from '../../models/IdType'

import { Network } from '../../models/NetworkModel'
import { Table, ValueType } from '../../models/TableModel'

export class CyDB extends Dexie {
  cyNetworks!: DxTable<Network>
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
  // @ts-ignore
  const networkStore = network.store as cytoscape.Core

  return await db.cyNetworks.add({
    id: network.id,
    // @ts-ignore
    nodes: networkStore.nodes().map((n) => ({
      id: n.id(),
    })),
    edges: networkStore.edges().map((e) => ({
      id: e.id(),
      s: e.source().id(),
      t: e.target().id(),
    })),
  })
}
