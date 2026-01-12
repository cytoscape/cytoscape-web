import { act, renderHook } from '@testing-library/react'
import { IdType } from '../../models/IdType'
import NetworkFn, { Network } from '../../models/NetworkModel'
import { Table, Column } from '../../models/TableModel'
import TableFn from '../../models/TableModel'
import { NetworkView } from '../../models/ViewModel'
import ViewModelFn from '../../models/ViewModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useCreateNode } from './useCreateNode'

// Mock the database operations
jest.mock('../db', () => ({
  ...jest.requireActual('../db'),
  putNetworkToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworksFromDb: jest.fn().mockResolvedValue(undefined),
  putTableToDb: jest.fn().mockResolvedValue(undefined),
  deleteTableFromDb: jest.fn().mockResolvedValue(undefined),
  clearTablesFromDb: jest.fn().mockResolvedValue(undefined),
  putViewModelToDb: jest.fn().mockResolvedValue(undefined),
  putNetworkViewToDb: jest.fn().mockResolvedValue(undefined),
  putNetworkViewsToDb: jest.fn().mockResolvedValue(undefined),
  deleteViewModelFromDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
  clearViewModelsFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkViewsFromDb: jest.fn().mockResolvedValue(undefined),
}))

// Mock workspace store
jest.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

// Mock undo stack
jest.mock('./useUndoStack', () => ({
  useUndoStack: () => ({
    postEdit: jest.fn(),
  }),
}))

describe('useCreateNode', () => {
  const networkId: IdType = 'test-network-1'

  const createTestNetwork = (id: IdType, nodeIds: string[]): Network => {
    const nodes = nodeIds.map((nid) => ({ id: nid }))
    return NetworkFn.createNetworkFromLists(id, nodes, [])
  }

  const createTestTable = (id: IdType): Table => {
    const columns: Column[] = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'integer' },
      { name: 'category', type: 'string' },
    ]
    return TableFn.createTable(id, columns)
  }

  const createTestViewModel = (networkId: IdType, network: Network): NetworkView => {
    return ViewModelFn.createViewModel(network, networkId)
  }

  beforeEach(() => {
    // Reset all stores
    const networkStore = renderHook(() => useNetworkStore())
    const tableStore = renderHook(() => useTableStore())
    const viewModelStore = renderHook(() => useViewModelStore())

    act(() => {
      networkStore.result.current.deleteAll()
      tableStore.result.current.deleteAll()
      viewModelStore.result.current.deleteAll()
    })
  })

  describe('generateNextNodeId', () => {
    it('should return "0" for empty network', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateNode())

      const network = createTestNetwork(networkId, [])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextNodeId(networkId)
      expect(nextId).toBe('0')
    })

    it('should return "1" for network with node "0"', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateNode())

      const network = createTestNetwork(networkId, ['0'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextNodeId(networkId)
      expect(nextId).toBe('1')
    })

    it('should return max + 1 for network with multiple numeric IDs', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateNode())

      const network = createTestNetwork(networkId, ['0', '5', '3', '10'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextNodeId(networkId)
      expect(nextId).toBe('11')
    })

    it('should handle non-numeric IDs gracefully', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateNode())

      const network = createTestNetwork(networkId, ['node1', 'node2', '5'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextNodeId(networkId)
      expect(nextId).toBe('6')
    })

    it('should return "0" for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())

      const nextId = hookResult.current.generateNextNodeId('non-existent')
      expect(nextId).toBe('0')
    })
  })

  describe('createNode', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, [])
      const table = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, table, table)
        viewModelResult.current.add(networkId, viewModel)
      })
    })

    it('should create a node successfully', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.createNode(networkId, [100, 200])
      })

      expect(result.success).toBe(true)
      expect(result.nodeId).toBe('0')
      expect(result.error).toBeUndefined()

      const network = networkResult.current.networks.get(networkId)
      expect(network?.nodes.find((n) => n.id === '0')).toBeDefined()
    })

    it('should add node to network store', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      act(() => {
        hookResult.current.createNode(networkId, [100, 200])
      })

      const network = networkResult.current.networks.get(networkId)
      expect(network?.nodes).toHaveLength(1)
      expect(network?.nodes[0].id).toBe('0')
    })

    it('should add node to table store with default values', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createNode(networkId, [100, 200])
      })

      const tableRecord = tableResult.current.tables[networkId]
      const nodeTable = tableRecord?.nodeTable

      expect(nodeTable?.rows.has('0')).toBe(true)
      const row = nodeTable?.rows.get('0')
      expect(row?.name).toBe('Node 0')
    })

    it('should add node to view model store with correct position', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createNode(networkId, [150, 250])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const nodeView = viewModels?.[0]?.nodeViews['0']

      expect(nodeView).toBeDefined()
      expect(nodeView?.x).toBe(150)
      expect(nodeView?.y).toBe(250)
      expect(nodeView?.z).toBeUndefined()
    })

    it('should handle 3D position correctly', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createNode(networkId, [100, 200, 50])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const nodeView = viewModels?.[0]?.nodeViews['0']

      expect(nodeView?.z).toBe(50)
    })

    it('should apply custom attributes', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createNode(networkId, [100, 200], {
          attributes: {
            name: 'Custom Node',
            score: 100,
            category: 'protein',
          },
        })
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.nodeTable?.rows.get('0')

      expect(row?.name).toBe('Custom Node')
      expect(row?.score).toBe(100)
      expect(row?.category).toBe('protein')
    })

    it('should auto-select the new node by default', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createNode(networkId, [100, 200])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const selectedNodes = viewModels?.[0]?.selectedNodes

      expect(selectedNodes).toContain('0')
    })

    it('should not auto-select when autoSelect is false', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createNode(networkId, [100, 200], {
          autoSelect: false,
        })
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const selectedNodes = viewModels?.[0]?.selectedNodes

      expect(selectedNodes).not.toContain('0')
      expect(selectedNodes).toHaveLength(0)
    })

    it('should generate sequential IDs for multiple nodes', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      act(() => {
        hookResult.current.createNode(networkId, [100, 200])
        hookResult.current.createNode(networkId, [200, 300])
        hookResult.current.createNode(networkId, [300, 400])
      })

      const network = networkResult.current.networks.get(networkId)
      expect(network?.nodes).toHaveLength(3)
      expect(network?.nodes.map((n) => n.id).sort()).toEqual(['0', '1', '2'])
    })

    it('should return error for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())

      let result: any

      act(() => {
        result = hookResult.current.createNode('non-existent', [100, 200])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
      expect(result.nodeId).toBe('')
    })

    it('should not set default name if name column does not exist', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: tableResult } = renderHook(() => useTableStore())

      // Create table without name column
      const columns: Column[] = [
        { name: 'score', type: 'integer' },
      ]
      const tableWithoutName = TableFn.createTable(networkId, columns)

      act(() => {
        tableResult.current.add(
          networkId,
          tableWithoutName,
          tableWithoutName,
        )
      })

      act(() => {
        hookResult.current.createNode(networkId, [100, 200])
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.nodeTable?.rows.get('0')

      expect(row?.name).toBeUndefined()
    })

    it('should preserve custom name over default', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createNode(networkId, [100, 200], {
          attributes: {
            name: 'My Custom Name',
          },
        })
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.nodeTable?.rows.get('0')

      expect(row?.name).toBe('My Custom Name')
    })

    it('should handle errors gracefully', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())

      // Mock an error by using a completely broken setup
      let result: any

      act(() => {
        result = hookResult.current.createNode('bad-id', [100, 200])
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should create nodes at different positions', () => {
      const { result: hookResult } = renderHook(() => useCreateNode())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createNode(networkId, [50, 100])
        hookResult.current.createNode(networkId, [150, 200])
        hookResult.current.createNode(networkId, [250, 300])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const nodeViews = viewModels?.[0]?.nodeViews

      expect(nodeViews?.['0']?.x).toBe(50)
      expect(nodeViews?.['0']?.y).toBe(100)

      expect(nodeViews?.['1']?.x).toBe(150)
      expect(nodeViews?.['1']?.y).toBe(200)

      expect(nodeViews?.['2']?.x).toBe(250)
      expect(nodeViews?.['2']?.y).toBe(300)
    })
  })

  describe('integration', () => {
    it('should create multiple nodes with mixed IDs', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: hookResult } = renderHook(() => useCreateNode())

      // Start with a network that has non-sequential IDs
      const network = createTestNetwork(networkId, ['5', '10', 'node-a'])
      const table = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, table, table)
        viewModelResult.current.add(networkId, viewModel)
      })

      // Create new nodes
      let result1: any, result2: any

      act(() => {
        result1 = hookResult.current.createNode(networkId, [100, 200])
        result2 = hookResult.current.createNode(networkId, [200, 300])
      })

      expect(result1.nodeId).toBe('11') // Max was 10
      expect(result2.nodeId).toBe('12')

      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.nodes).toHaveLength(5)
    })

    it('should handle all stores consistently', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: hookResult } = renderHook(() => useCreateNode())

      const network = createTestNetwork(networkId, [])
      const table = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, table, table)
        viewModelResult.current.add(networkId, viewModel)
      })

      act(() => {
        hookResult.current.createNode(networkId, [150, 250], {
          attributes: {
            name: 'Test Node',
            score: 42,
          },
        })
      })

      // Check network
      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.nodes.find((n) => n.id === '0')).toBeDefined()

      // Check table
      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.nodeTable?.rows.get('0')
      expect(row?.name).toBe('Test Node')
      expect(row?.score).toBe(42)

      // Check view model
      const viewModels = viewModelResult.current.viewModels[networkId]
      const nodeView = viewModels?.[0]?.nodeViews['0']
      expect(nodeView?.x).toBe(150)
      expect(nodeView?.y).toBe(250)

      // Check selection
      const selectedNodes = viewModels?.[0]?.selectedNodes
      expect(selectedNodes).toContain('0')
    })
  })
})

