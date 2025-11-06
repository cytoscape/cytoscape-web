import { act, renderHook } from '@testing-library/react'

import { IdType } from '../models/IdType'
import NetworkFn, { Network } from '../models/NetworkModel'
import { UpdateEventType } from '../models/StoreModel/NetworkStoreModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useTableManager } from './useTableManager'

// Mock the database operations to avoid IndexedDB issues in tests
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
  putTablesToDb: jest.fn().mockResolvedValue(undefined),
  deleteTablesFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock the workspace store
jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useTableManager', () => {
  const createTestNetwork = (id: IdType): Network => {
    return NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
  }

  beforeEach(() => {
    // Reset stores to initial state before each test
    const networkStore = renderHook(() => useNetworkStore())
    const tableStore = renderHook(() => useTableStore())
    act(() => {
      networkStore.result.current.deleteAll()
      tableStore.result.current.deleteAll()
    })
  })

  it('should delete table rows when network elements are deleted', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: tableStoreResult } = renderHook(() => useTableStore())

    act(() => {
      networkStoreResult.current.add(network)
      tableStoreResult.current.add(networkId, {
        id: `${networkId}-nodes`,
        columns: [],
        rows: new Map([
          ['n1', { name: 'Node 1' }],
          ['n2', { name: 'Node 2' }],
        ]),
      }, {
        id: `${networkId}-edges`,
        columns: [],
        rows: new Map([
          ['e1', { weight: 1.0 }],
        ]),
      })
    })

    // Verify initial state
    const initialTable = tableStoreResult.current.tables[networkId]
    expect(initialTable?.nodeTable.rows.size).toBe(2)
    expect(initialTable?.edgeTable.rows.size).toBe(1)

    // Render the manager hook
    renderHook(() => useTableManager())

    // Delete nodes
    act(() => {
      networkStoreResult.current.deleteNodes(networkId, ['n1', 'n2'])
    })

    // Check that rows were deleted
    const updatedTable = tableStoreResult.current.tables[networkId]
    expect(updatedTable?.nodeTable.rows.size).toBe(0)
  })

  it('should delete edge table rows when edges are deleted', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: tableStoreResult } = renderHook(() => useTableStore())

    act(() => {
      networkStoreResult.current.add(network)
      tableStoreResult.current.add(networkId, {
        id: `${networkId}-nodes`,
        columns: [],
        rows: new Map(),
      }, {
        id: `${networkId}-edges`,
        columns: [],
        rows: new Map([
          ['e1', { weight: 1.0 }],
        ]),
      })
    })

    // Render the manager hook
    renderHook(() => useTableManager())

      // Delete edge
      act(() => {
        networkStoreResult.current.deleteEdges(networkId, ['e1'])
      })

    // Check that edge row was deleted
    const updatedTable = tableStoreResult.current.tables[networkId]
    expect(updatedTable?.edgeTable.rows.size).toBe(0)
  })

  it('should not delete rows for non-DELETE events', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: tableStoreResult } = renderHook(() => useTableStore())

    act(() => {
      networkStoreResult.current.add(network)
      tableStoreResult.current.add(networkId, {
        id: `${networkId}-nodes`,
        columns: [],
        rows: new Map([
          ['n1', { name: 'Node 1' }],
        ]),
      }, {
        id: `${networkId}-edges`,
        columns: [],
        rows: new Map(),
      })
    })

    const initialTable = tableStoreResult.current.tables[networkId]

    // Render the manager hook
    renderHook(() => useTableManager())

    // Add a node (not DELETE event)
    act(() => {
      networkStoreResult.current.addNode(networkId, 'n3')
    })

    // Check that rows remain unchanged
    const updatedTable = tableStoreResult.current.tables[networkId]
    expect(updatedTable?.nodeTable.rows.size).toBe(
      initialTable?.nodeTable.rows.size,
    )
  })

  it('should handle multiple deletions', () => {
    const networkId: IdType = 'network-1'
    const network = createTestNetwork(networkId)

    // Set up stores
    const { result: networkStoreResult } = renderHook(() => useNetworkStore())
    const { result: tableStoreResult } = renderHook(() => useTableStore())

    act(() => {
      networkStoreResult.current.add(network)
      tableStoreResult.current.add(networkId, {
        id: `${networkId}-nodes`,
        columns: [],
        rows: new Map([
          ['n1', { name: 'Node 1' }],
          ['n2', { name: 'Node 2' }],
        ]),
      }, {
        id: `${networkId}-edges`,
        columns: [],
        rows: new Map([
          ['e1', { weight: 1.0 }],
        ]),
      })
    })

    // Render the manager hook
    renderHook(() => useTableManager())

      // Delete nodes and edges
      act(() => {
        networkStoreResult.current.deleteNodes(networkId, ['n1'])
        networkStoreResult.current.deleteEdges(networkId, ['e1'])
      })

    // Check that both node and edge rows were deleted
    const updatedTable = tableStoreResult.current.tables[networkId]
    expect(updatedTable?.nodeTable.rows.size).toBe(1)
    expect(updatedTable?.edgeTable.rows.size).toBe(0)
  })
})

