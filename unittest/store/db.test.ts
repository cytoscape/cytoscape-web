import { Network } from '../../src/models/NetworkModel'
import { NetworkView } from '../../src/models/ViewModel'
import * as db from '../../src/store/persist/db' // Assuming db is a module

const networkModelId1 = 'network1'

const net1: Network = {
  id: networkModelId1,
  nodes: [{ id: 'node1' }, { id: 'node2' }],
  edges: [{ id: 'edge1', s: 'node1', t: 'node2' }],
}
const net2: Network = {
  id: 'networkModelId2',
  nodes: [...net1.nodes, { id: 'node3' }, { id: 'node4' }],
  edges: [...net1.edges, { id: 'edge2', s: 'node3', t: 'node4' }],
}
const networkView1: NetworkView = {
  id: networkModelId1,
  type: `${networkModelId1}-circlePacking`,
  values: new Map(),
  nodeViews: {
    node6: { id: 'node6', x: 500, y: 501, values: new Map() },
    node7: { id: 'node7', x: 600, y: 601, values: new Map() },
    node8: { id: 'node8', x: 700, y: 701, values: new Map() },
    node9: { id: 'node9', x: 800, y: 801, values: new Map() },
    node10: { id: 'node10', x: 900, y: 901, values: new Map() },
  },
  edgeViews: {
    edge3: { id: 'edge3', values: new Map() },
    edge4: { id: 'edge4', values: new Map() },
  },
  selectedNodes: [],
  selectedEdges: [],
}

const networkView2: NetworkView = {
  id: networkModelId1,
  type: `${networkModelId1}-nodeLink`,
  values: new Map(),
  nodeViews: {
    node11: { id: 'node11', x: 1100, y: 1101, values: new Map() },
    node12: { id: 'node12', x: 1200, y: 1201, values: new Map() },
    node13: { id: 'node13', x: 1300, y: 1301, values: new Map() },
    node14: { id: 'node14', x: 1400, y: 1401, values: new Map() },
    node15: { id: 'node15', x: 1500, y: 1501, values: new Map() },
  },
  edgeViews: {
    edge5: { id: 'edge5', values: new Map() },
    edge6: { id: 'edge6', values: new Map() },
  },
  selectedNodes: [],
  selectedEdges: [],
}

describe('DB functions', () => {
  beforeEach(async () => {
    await db.initializeDb()
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  it('getAllNetworkKeys should return the correct keys', async () => {
    // Test getAllNetworkKeys
    await db.putNetworkToDb(net1)
    const result = await db.getAllNetworkKeys()
    expect(result).toBeDefined()
    expect(result).toHaveLength(1)
    const resNet: string = result[0]
    expect(resNet).toEqual('network1')
  })

  it('putNetworkViews should accept array of views', async () => {
    // Check that the view was added correctly
    await db.putNetworkViewsToDb(networkModelId1, [networkView1, networkView2])
    const viewList = await db.getNetworkViewsFromDb(networkModelId1)
    expect(viewList?.length).toEqual(2)
    expect(viewList).toEqual([networkView1, networkView2])
  })

  it('getNetworkViewFromDb should return the correct view', async () => {
    // Test getNetworkViewFromDb
    await db.putNetworkViewsToDb(networkModelId1, [networkView1, networkView2])
    const result = await db.getNetworkViewsFromDb(networkModelId1)
    expect(result).toBeDefined()
    expect(result?.length).toEqual(2)
  })

  it('deleteNetworkViewFromDb should delete the view correctly', async () => {
    // Test deleteNetworkViewFromDb
    await db.putNetworkViewsToDb(networkModelId1, [networkView1, networkView2])
    await db.putNetworkViewsToDb(net2.id, [networkView2])
    
    await db.deleteNetworkViewsFromDb(networkModelId1)
    const result = await db.getNetworkViewsFromDb(networkModelId1)
    expect(result).toBeUndefined()
    
    const result2 = await db.getNetworkViewsFromDb(net2.id)
    expect(result2).toBeDefined()
    expect(result2).toEqual([networkView2])
  })

  it('delete all', async () => {
    await db.putNetworkViewsToDb(networkModelId1, [networkView1, networkView2])
    await db.putNetworkViewsToDb(net2.id, [networkView1])
    await db.deleteDb()
    const result = await db.getNetworkViewsFromDb(networkModelId1)
    expect(result).toBeUndefined()
  })
})
