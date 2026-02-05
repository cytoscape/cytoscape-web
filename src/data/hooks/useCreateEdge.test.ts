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
import { useCreateEdge } from './useCreateEdge'

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

describe('useCreateEdge', () => {
  const networkId: IdType = 'test-network-1'

  const createTestNetwork = (
    id: IdType,
    nodeIds: string[],
    edgeIds: string[] = [],
  ): Network => {
    const nodes = nodeIds.map((nid) => ({ id: nid }))
    const edges = edgeIds.map((eid, idx) => ({
      id: eid,
      s: nodeIds[idx % nodeIds.length],
      t: nodeIds[(idx + 1) % nodeIds.length],
    }))
    return NetworkFn.createNetworkFromLists(id, nodes, edges)
  }

  const createTestTable = (id: IdType): Table => {
    const columns: Column[] = [
      { name: 'name', type: 'string' },
      { name: 'interaction', type: 'string' },
      { name: 'weight', type: 'double' },
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

  describe('generateNextEdgeId', () => {
    it('should return "e0" for empty network', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const network = createTestNetwork(networkId, ['n1', 'n2'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextEdgeId(networkId)
      expect(nextId).toBe('e0')
    })

    it('should return "e1" for network with edge "e0"', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const network = createTestNetwork(networkId, ['n1', 'n2'], ['e0'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextEdgeId(networkId)
      expect(nextId).toBe('e1')
    })

    it('should return max + 1 for network with multiple numeric IDs', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const network = createTestNetwork(networkId, ['n1', 'n2'], ['e0', 'e5', 'e3', 'e10'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextEdgeId(networkId)
      expect(nextId).toBe('e11')
    })

    it('should handle non-numeric IDs gracefully', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const network = createTestNetwork(networkId, ['n1', 'n2'], ['edge1', 'edge2', 'e5'])

      act(() => {
        networkResult.current.add(network)
      })

      const nextId = hookResult.current.generateNextEdgeId(networkId)
      expect(nextId).toBe('e6')
    })

    it('should return "e0" for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const nextId = hookResult.current.generateNextEdgeId('non-existent')
      expect(nextId).toBe('e0')
    })
  })

  describe('createEdge', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, ['n1', 'n2', 'n3'])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
      })
    })

    it('should create an edge successfully', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      expect(result.success).toBe(true)
      expect(result.edgeId).toBe('e0')
      expect(result.error).toBeUndefined()

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges.find((e) => e.id === 'e0')).toBeDefined()
    })

    it('should add edge to network store', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(1)
      expect(network?.edges[0].id).toBe('e0')
      expect(network?.edges[0].s).toBe('n1')
      expect(network?.edges[0].t).toBe('n2')
    })

    it('should add edge to table store with default values', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const tableRecord = tableResult.current.tables[networkId]
      const edgeTable = tableRecord?.edgeTable

      expect(edgeTable?.rows.has('e0')).toBe(true)
      const row = edgeTable?.rows.get('e0')
      expect(row?.name).toBe('n1 (interacts with) n2')
    })

    it('should add edge to view model store', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const edgeView = viewModels?.[0]?.edgeViews['e0']

      expect(edgeView).toBeDefined()
      expect(edgeView?.id).toBe('e0')
      expect(edgeView?.values).toBeDefined()
    })

    it('should apply custom attributes', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2', {
          attributes: {
            name: 'Custom Edge',
            interaction: 'activates',
            weight: 0.85,
          },
        })
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.edgeTable?.rows.get('e0')

      expect(row?.name).toBe('Custom Edge')
      expect(row?.interaction).toBe('activates')
      expect(row?.weight).toBe(0.85)
    })

    it('should auto-select the new edge by default', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const selectedEdges = viewModels?.[0]?.selectedEdges

      expect(selectedEdges).toContain('e0')
    })

    it('should not auto-select when autoSelect is false', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2', {
          autoSelect: false,
        })
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      const selectedEdges = viewModels?.[0]?.selectedEdges

      expect(selectedEdges).not.toContain('e0')
      expect(selectedEdges).toHaveLength(0)
    })

    it('should generate sequential IDs for multiple edges', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
        hookResult.current.createEdge(networkId, 'n2', 'n3')
        hookResult.current.createEdge(networkId, 'n3', 'n1')
      })

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(3)
      expect(network?.edges.map((e) => e.id).sort()).toEqual(['e0', 'e1', 'e2'])
    })

    it('should return error for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())

      let result: any

      act(() => {
        result = hookResult.current.createEdge('non-existent', 'n1', 'n2')
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
      expect(result.edgeId).toBe('')
    })

    it('should return error for non-existent source node', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())

      let result: any

      act(() => {
        result = hookResult.current.createEdge(networkId, 'nonexistent', 'n2')
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Source node')
      expect(result.error).toContain('not found')
      expect(result.edgeId).toBe('')
    })

    it('should return error for non-existent target node', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())

      let result: any

      act(() => {
        result = hookResult.current.createEdge(networkId, 'n1', 'nonexistent')
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Target node')
      expect(result.error).toContain('not found')
      expect(result.edgeId).toBe('')
    })

    it('should allow self-loops', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.createEdge(networkId, 'n1', 'n1')
      })

      expect(result.success).toBe(true)

      const network = networkResult.current.networks.get(networkId)
      const edge = network?.edges.find((e) => e.id === 'e0')
      expect(edge?.s).toBe('n1')
      expect(edge?.t).toBe('n1')
    })

    it('should allow duplicate edges between same nodes', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const network = networkResult.current.networks.get(networkId)
      const edgesBetweenN1N2 = network?.edges.filter(
        (e) => e.s === 'n1' && e.t === 'n2',
      )
      expect(edgesBetweenN1N2).toHaveLength(2)
    })

    it('should not set default name if name column does not exist', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: tableResult } = renderHook(() => useTableStore())

      // Create table without name column
      const columns: Column[] = [
        { name: 'weight', type: 'double' },
      ]
      const tableWithoutName = TableFn.createTable(networkId, columns)

      act(() => {
        tableResult.current.add(networkId, tableWithoutName, tableWithoutName)
      })

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2')
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.edgeTable?.rows.get('e0')

      expect(row?.name).toBeUndefined()
    })

    it('should preserve custom name over default', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2', {
          attributes: {
            name: 'My Custom Edge Name',
          },
        })
      })

      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.edgeTable?.rows.get('e0')

      expect(row?.name).toBe('My Custom Edge Name')
    })

    it('should handle errors gracefully', () => {
      const { result: hookResult } = renderHook(() => useCreateEdge())

      let result: any

      act(() => {
        result = hookResult.current.createEdge('bad-id', 'n1', 'n2')
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('integration', () => {
    it('should create multiple edges with mixed IDs', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: hookResult } = renderHook(() => useCreateEdge())

      // Start with a network that has non-sequential edge IDs
      const network = createTestNetwork(
        networkId,
        ['n1', 'n2', 'n3'],
        ['e5', 'e10', 'edge-a'],
      )
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
      })

      // Create new edges
      let result1: any, result2: any

      act(() => {
        result1 = hookResult.current.createEdge(networkId, 'n1', 'n2')
        result2 = hookResult.current.createEdge(networkId, 'n2', 'n3')
      })

      expect(result1.edgeId).toBe('e11') // Max was 10
      expect(result2.edgeId).toBe('e12')

      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.edges).toHaveLength(5)
    })

    it('should handle all stores consistently', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: hookResult } = renderHook(() => useCreateEdge())

      const network = createTestNetwork(networkId, ['n1', 'n2', 'n3'])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
      })

      act(() => {
        hookResult.current.createEdge(networkId, 'n1', 'n2', {
          attributes: {
            name: 'Test Edge',
            interaction: 'inhibits',
            weight: 0.5,
          },
        })
      })

      // Check network
      const updatedNetwork = networkResult.current.networks.get(networkId)
      const edge = updatedNetwork?.edges.find((e) => e.id === 'e0')
      expect(edge).toBeDefined()
      expect(edge?.s).toBe('n1')
      expect(edge?.t).toBe('n2')

      // Check table
      const tableRecord = tableResult.current.tables[networkId]
      const row = tableRecord?.edgeTable?.rows.get('e0')
      expect(row?.name).toBe('Test Edge')
      expect(row?.interaction).toBe('inhibits')
      expect(row?.weight).toBe(0.5)

      // Check view model
      const viewModels = viewModelResult.current.viewModels[networkId]
      const edgeView = viewModels?.[0]?.edgeViews['e0']
      expect(edgeView?.id).toBe('e0')

      // Check selection
      const selectedEdges = viewModels?.[0]?.selectedEdges
      expect(selectedEdges).toContain('e0')
    })
  })
})

