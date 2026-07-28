import { describe, expect, it, vi } from 'vitest'

import NetworkFn from '../../NetworkModel'
import { TableType } from '../../StoreModel/TableStoreModel'
import {
  createEdgesCore,
  deleteEdgesCore,
  EdgeOperationStoreActions,
} from './edgeOperations'

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
  overrides: Partial<EdgeOperationStoreActions> = {},
): EdgeOperationStoreActions => ({
  deleteEdgesFromNetwork: vi.fn(),
  addEdge: vi.fn(),
  deleteRows: vi.fn(),
  editRows: vi.fn(),
  deleteViewObjects: vi.fn(),
  addEdgeView: vi.fn(),
  updateNetworkSummary: vi.fn(),
  networks: new Map(),
  tables: {},
  viewModels: {},
  visualStyles: {},
  ...overrides,
})

describe('deleteEdgesCore', () => {
  it('captures rows and views before deletion and cascades to every store', () => {
    const network = makeNetwork()
    const actions = makeActions({
      tables: {
        [NET_ID]: {
          nodeTable: { rows: new Map() },
          edgeTable: { rows: new Map([['e1', { weight: 7 }]]) },
        },
      },
      viewModels: {
        [NET_ID]: {
          nodeViews: {},
          edgeViews: { e1: { id: 'e1', values: new Map() } },
        },
      },
    })

    const result = deleteEdgesCore(NET_ID, ['e1'], network, actions)

    expect(result.deletedEdgeIds).toEqual(['e1'])
    expect(result.deletedEdgeRows.get('e1')).toEqual({ weight: 7 })
    expect(result.deletedEdgeViews).toHaveLength(1)

    expect(actions.deleteEdgesFromNetwork).toHaveBeenCalledWith(NET_ID, ['e1'])
    expect(actions.deleteViewObjects).toHaveBeenCalledWith(NET_ID, ['e1'])
    expect(actions.deleteRows).toHaveBeenCalledWith(NET_ID, ['e1'])

    // Node count unchanged; edge count derives from pre-deletion topology
    expect(actions.updateNetworkSummary).toHaveBeenCalledWith(NET_ID, {
      nodeCount: 3,
      edgeCount: 1,
    })
  })
})

describe('createEdgesCore', () => {
  it('throws when the network does not exist', () => {
    expect(() =>
      createEdgesCore(
        {
          networkId: 'missing',
          edgeIds: ['e9'],
          sourceId: 'n1',
          targetId: 'n2',
          attributes: {},
        },
        makeActions(),
      ),
    ).toThrow('Network missing not found')
  })

  it.each([
    ['source', 'n9', 'n2', 'Source node n9 not found'],
    ['target', 'n1', 'n9', 'Target node n9 not found'],
  ])(
    'throws when the %s node does not exist',
    (_endpoint, sourceId, targetId, message) => {
      const actions = makeActions({
        networks: new Map([[NET_ID, makeNetwork()]]),
      })

      expect(() =>
        createEdgesCore(
          {
            networkId: NET_ID,
            edgeIds: ['e9'],
            sourceId,
            targetId,
            attributes: {},
          },
          actions,
        ),
      ).toThrow(message)
    },
  )

  it('adds topology, table rows, and views, then bumps the summary count', () => {
    const actions = makeActions({
      networks: new Map([[NET_ID, makeNetwork()]]),
      tables: {
        [NET_ID]: { nodeTable: undefined, edgeTable: { rows: new Map() } },
      },
      viewModels: { [NET_ID]: { nodeViews: {}, edgeViews: {} } },
    })

    createEdgesCore(
      {
        networkId: NET_ID,
        edgeIds: ['e3'],
        sourceId: 'n1',
        targetId: 'n3',
        attributes: { interaction: 'binds' },
      },
      actions,
    )

    expect(actions.addEdge).toHaveBeenCalledWith(NET_ID, 'e3', 'n1', 'n3')

    const editedRows = vi.mocked(actions.editRows).mock.calls[0]
    expect(editedRows[1]).toBe(TableType.EDGE)
    expect(editedRows[2].get('e3')).toEqual({ interaction: 'binds' })

    expect(actions.addEdgeView).toHaveBeenCalledWith(
      NET_ID,
      expect.objectContaining({ id: 'e3' }),
    )

    expect(actions.updateNetworkSummary).toHaveBeenCalledWith(NET_ID, {
      nodeCount: 3,
      edgeCount: 3,
    })
  })
})
