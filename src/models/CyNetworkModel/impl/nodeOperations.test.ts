import { describe, expect, it, vi } from 'vitest'

import NetworkFn from '../../NetworkModel'
import { TableType } from '../../StoreModel/TableStoreModel'
import type { NodeView } from '../../ViewModel'
import {
  createNodesCore,
  deleteNodesCore,
  NodeOperationStoreActions,
} from './nodeOperations'

const NET_ID = 'net-1'

// n1 —e1— n2 —e2— n3
const makeNetwork = () =>
  NetworkFn.createNetworkFromLists(
    NET_ID,
    [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
    [
      { id: 'e1', s: 'n1', t: 'n2' },
      { id: 'e2', s: 'n2', t: 'n3' },
    ],
  )

const makeActions = (
  overrides: Partial<NodeOperationStoreActions> = {},
): NodeOperationStoreActions => ({
  deleteNodesFromNetwork: vi.fn().mockReturnValue([]),
  addNode: vi.fn(),
  deleteRows: vi.fn(),
  editRows: vi.fn(),
  deleteViewObjects: vi.fn(),
  addNodeView: vi.fn(),
  updateNetworkSummary: vi.fn(),
  networks: new Map(),
  tables: {},
  viewModels: {},
  visualStyles: {},
  ...overrides,
})

describe('deleteNodesCore', () => {
  it('captures rows and views before deletion and cascades to every store', () => {
    const network = makeNetwork()
    const connectingEdges = [{ id: 'e1', s: 'n1', t: 'n2' }]
    const actions = makeActions({
      deleteNodesFromNetwork: vi.fn().mockReturnValue(connectingEdges),
      tables: {
        [NET_ID]: {
          nodeTable: { rows: new Map([['n1', { name: 'Node 1' }]]) },
          edgeTable: { rows: new Map([['e1', { weight: 2 }]]) },
        },
      },
      viewModels: {
        [NET_ID]: {
          nodeViews: { n1: { id: 'n1', x: 10, y: 20, values: new Map() } },
          edgeViews: { e1: { id: 'e1', values: new Map() } },
        },
      },
    })

    const result = deleteNodesCore(NET_ID, ['n1'], network, actions)

    // Undo payload captured pre-deletion
    expect(result.deletedNodeIds).toEqual(['n1'])
    expect(result.deletedEdges).toEqual(connectingEdges)
    expect(result.deletedNodeRows.get('n1')).toEqual({ name: 'Node 1' })
    expect(result.deletedEdgeRows.get('e1')).toEqual({ weight: 2 })
    expect(result.deletedNodeViews).toHaveLength(1)
    expect(result.deletedEdgeViews).toHaveLength(1)

    // Cascade: node + connecting edge removed from views and tables
    expect(actions.deleteViewObjects).toHaveBeenCalledWith(NET_ID, [
      'n1',
      'e1',
    ])
    expect(actions.deleteRows).toHaveBeenCalledWith(NET_ID, ['n1', 'e1'])

    // Summary counts derive from the PRE-deletion topology (3 nodes, 2 edges)
    expect(actions.updateNetworkSummary).toHaveBeenCalledWith(NET_ID, {
      nodeCount: 2,
      edgeCount: 1,
    })
  })

  it('tolerates a network with no tables or view model', () => {
    const network = makeNetwork()
    const actions = makeActions()

    const result = deleteNodesCore(NET_ID, ['n1'], network, actions)

    expect(result.deletedNodeRows.size).toBe(0)
    expect(result.deletedNodeViews).toEqual([])
    expect(actions.deleteRows).toHaveBeenCalledWith(NET_ID, ['n1'])
  })
})

describe('createNodesCore', () => {
  it('throws when the network does not exist', () => {
    expect(() =>
      createNodesCore(
        {
          networkId: 'missing',
          nodeIds: ['n9'],
          position: [0, 0],
          attributes: {},
        },
        makeActions(),
      ),
    ).toThrow('Network missing not found')
  })

  it('adds topology, table rows, and positioned views, then bumps the summary count', () => {
    const network = makeNetwork()
    const actions = makeActions({
      networks: new Map([[NET_ID, network]]),
      tables: {
        [NET_ID]: { nodeTable: { rows: new Map() }, edgeTable: undefined },
      },
      viewModels: { [NET_ID]: { nodeViews: {}, edgeViews: {} } },
    })

    createNodesCore(
      {
        networkId: NET_ID,
        nodeIds: ['n4', 'n5'],
        position: [1, 2, 3],
        attributes: { name: 'new node' },
      },
      actions,
    )

    expect(actions.addNode).toHaveBeenCalledWith(NET_ID, 'n4')
    expect(actions.addNode).toHaveBeenCalledWith(NET_ID, 'n5')

    const editedRows = vi.mocked(actions.editRows).mock.calls[0]
    expect(editedRows[1]).toBe(TableType.NODE)
    expect(editedRows[2].get('n4')).toEqual({ name: 'new node' })

    const addedView = vi.mocked(actions.addNodeView).mock
      .calls[0][1] as NodeView
    expect(addedView).toMatchObject({ id: 'n4', x: 1, y: 2, z: 3 })

    expect(actions.updateNetworkSummary).toHaveBeenCalledWith(NET_ID, {
      nodeCount: 5,
      edgeCount: 2,
    })
  })
})
