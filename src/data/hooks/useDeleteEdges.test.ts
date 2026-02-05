import { act, renderHook } from '@testing-library/react'
import { IdType } from '../../models/IdType'
import NetworkFn, { Network } from '../../models/NetworkModel'
import { Table, Column } from '../../models/TableModel'
import TableFn from '../../models/TableModel'
import { NetworkView } from '../../models/ViewModel'
import ViewModelFn from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { getDefaultVisualStyle } from '../../models/VisualStyleModel/impl/defaultVisualStyle'
import { ValueTypeName } from '../../models/TableModel/ValueTypeName'
import { createNetworkSummary } from '../../models/NetworkSummaryModel/impl/networkSummaryImpl'
import { useNetworkStore } from './stores/NetworkStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useDeleteEdges } from './useDeleteEdges'

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
  putVisualStyleToDb: jest.fn().mockResolvedValue(undefined),
  deleteVisualStyleFromDb: jest.fn().mockResolvedValue(undefined),
  clearVisualStylesFromDb: jest.fn().mockResolvedValue(undefined),
  putNetworkSummaryToDb: jest.fn().mockResolvedValue(undefined),
  deleteNetworkSummaryFromDb: jest.fn().mockResolvedValue(undefined),
  clearNetworkSummariesFromDb: jest.fn().mockResolvedValue(undefined),
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

describe('useDeleteEdges', () => {
  const networkId: IdType = 'test-network-1'

  const createTestNetwork = (
    id: IdType,
    nodeIds: string[],
    edges?: Array<{ id: string; s: string; t: string }>,
  ): Network => {
    const nodes = nodeIds.map((nid) => ({ id: nid }))
    const edgeList = edges || []
    return NetworkFn.createNetworkFromLists(id, nodes, edgeList)
  }

  const createTestTable = (id: IdType): Table => {
    const columns: Column[] = [
      { name: 'name', type: ValueTypeName.String },
      { name: 'interaction', type: ValueTypeName.String },
      { name: 'weight', type: ValueTypeName.Double },
    ]
    return TableFn.createTable(id, columns)
  }

  const createTestViewModel = (
    networkId: IdType,
    network: Network,
  ): NetworkView => {
    return ViewModelFn.createViewModel(network, networkId)
  }

  beforeEach(() => {
    // Reset all stores
    const networkStore = renderHook(() => useNetworkStore())
    const tableStore = renderHook(() => useTableStore())
    const viewModelStore = renderHook(() => useViewModelStore())
    const visualStyleStore = renderHook(() => useVisualStyleStore())
    const networkSummaryStore = renderHook(() => useNetworkSummaryStore())

    act(() => {
      networkStore.result.current.deleteAll()
      tableStore.result.current.deleteAll()
      viewModelStore.result.current.deleteAll()
      visualStyleStore.result.current.deleteAll()
      networkSummaryStore.result.current.deleteAll()
    })
  })

  describe('deleteEdges - basic functionality', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
        { id: 'e2', s: '0', t: '2' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
        summaryResult.current.add(
          networkId,
          createNetworkSummary({
            networkId,
            name: 'Test Network',
            nodeCount: 3,
            edgeCount: 3,
          }),
        )
      })
    })

    it('should delete a single edge successfully', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges(networkId, ['e0'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedEdgeCount).toBe(1)
      expect(result.error).toBeUndefined()

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(2)
      expect(network?.edges.find((e) => e.id === 'e0')).toBeUndefined()
      expect(network?.nodes).toHaveLength(3) // Nodes should not be deleted
    })

    it('should delete multiple edges successfully', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges(networkId, ['e0', 'e1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedEdgeCount).toBe(2)

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(1)
      expect(network?.edges[0].id).toBe('e2')
      expect(network?.nodes).toHaveLength(3) // All nodes should remain
    })

    it('should delete all edges successfully', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges(networkId, ['e0', 'e1', 'e2'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedEdgeCount).toBe(3)

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(0)
      expect(network?.nodes).toHaveLength(3) // All nodes should remain
    })

    it('should return error for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges('non-existent', ['e0'])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
      expect(result.deletedEdgeCount).toBe(0)
    })

    it('should return error when no edges specified', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges(networkId, [])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No edges specified')
      expect(result.deletedEdgeCount).toBe(0)
    })

    it('should return error when edges do not exist', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())

      let result: any

      act(() => {
        result = hookResult.current.deleteEdges(networkId, ['e999'])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('None of the specified edges exist')
      expect(result.deletedEdgeCount).toBe(0)
    })

    it('should update network summary counts', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0'])
      })

      const summary = summaryResult.current.summaries[networkId]
      expect(summary?.nodeCount).toBe(3)
      expect(summary?.edgeCount).toBe(2)
    })
  })

  describe('deleteEdges - table cleanup', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
        { id: 'e2', s: '0', t: '2' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)

        // Add table rows for edges
        const edgeRows = new Map()
        edgeRows.set('e0', { name: 'Edge 0', interaction: 'inhibits', weight: 0.5 })
        edgeRows.set('e1', { name: 'Edge 1', interaction: 'activates', weight: 0.8 })
        edgeRows.set('e2', { name: 'Edge 2', interaction: 'binds', weight: 0.3 })
        tableResult.current.editRows(networkId, 'edge', edgeRows)
      })
    })

    it('should delete edge table rows', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0'])
      })

      const tableRecord = tableResult.current.tables[networkId]
      expect(tableRecord?.edgeTable?.rows.has('e0')).toBe(false)
      expect(tableRecord?.edgeTable?.rows.has('e1')).toBe(true)
      expect(tableRecord?.edgeTable?.rows.has('e2')).toBe(true)
    })

    it('should delete multiple edge table rows', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0', 'e2'])
      })

      const tableRecord = tableResult.current.tables[networkId]
      expect(tableRecord?.edgeTable?.rows.has('e0')).toBe(false)
      expect(tableRecord?.edgeTable?.rows.has('e1')).toBe(true)
      expect(tableRecord?.edgeTable?.rows.has('e2')).toBe(false)
    })
  })

  describe('deleteEdges - view model cleanup', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
      })
    })

    it('should delete edge views', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0'])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.edgeViews['e0']).toBeUndefined()
      expect(viewModels?.[0]?.edgeViews['e1']).toBeDefined()
    })

    it('should not delete node views', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0'])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.nodeViews['0']).toBeDefined()
      expect(viewModels?.[0]?.nodeViews['1']).toBeDefined()
      expect(viewModels?.[0]?.nodeViews['2']).toBeDefined()
    })
  })

  describe('deleteEdges - visual style cleanup', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: visualStyleResult } = renderHook(() =>
        useVisualStyleStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)
      const visualStyle: VisualStyle = getDefaultVisualStyle()

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
        visualStyleResult.current.add(networkId, visualStyle)

        // Add some bypasses
        visualStyleResult.current.setBypass(
          networkId,
          'edgeLineColor',
          ['e0', 'e1'],
          '#FF0000',
        )
        visualStyleResult.current.setBypass(
          networkId,
          'edgeWidth',
          ['e0'],
          5,
        )
      })
    })

    it('should clean up edge bypasses for deleted edges', () => {
      const { result: hookResult } = renderHook(() => useDeleteEdges())
      const { result: visualStyleResult } = renderHook(() =>
        useVisualStyleStore(),
      )

      act(() => {
        hookResult.current.deleteEdges(networkId, ['e0'])
      })

      const visualStyle = visualStyleResult.current.visualStyles[networkId]
      const edgeColorBypass = visualStyle?.edgeLineColor?.bypassMap
      const edgeWidthBypass = visualStyle?.edgeWidth?.bypassMap

      expect(edgeColorBypass?.has('e0')).toBe(false)
      expect(edgeColorBypass?.has('e1')).toBe(true)
      expect(edgeWidthBypass?.has('e0')).toBe(false)
    })
  })

  describe('integration', () => {
    it('should handle complete deletion workflow', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: visualStyleResult } = renderHook(() =>
        useVisualStyleStore(),
      )
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )
      const { result: hookResult } = renderHook(() => useDeleteEdges())

      const network = createTestNetwork(networkId, ['0', '1', '2', '3'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
        { id: 'e2', s: '2', t: '3' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)
      const visualStyle: VisualStyle = getDefaultVisualStyle()

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
        visualStyleResult.current.add(networkId, visualStyle)
        summaryResult.current.add(
          networkId,
          createNetworkSummary({
            networkId,
            name: 'Test Network',
            nodeCount: 4,
            edgeCount: 3,
          }),
        )

        // Add table data
        const edgeRows = new Map()
        edgeRows.set('e0', { name: 'Edge 0', interaction: 'inhibits', weight: 0.5 })
        edgeRows.set('e1', { name: 'Edge 1', interaction: 'activates', weight: 0.8 })
        edgeRows.set('e2', { name: 'Edge 2', interaction: 'binds', weight: 0.3 })
        tableResult.current.editRows(networkId, 'edge', edgeRows)

        // Add bypasses
        visualStyleResult.current.setBypass(
          networkId,
          'edgeLineColor',
          ['e0', 'e1'],
          '#FF0000',
        )
      })

      // Delete edge e1
      let result: any
      act(() => {
        result = hookResult.current.deleteEdges(networkId, ['e1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedEdgeCount).toBe(1)

      // Check network
      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.edges).toHaveLength(2)
      expect(updatedNetwork?.edges.find((e) => e.id === 'e1')).toBeUndefined()
      expect(updatedNetwork?.nodes).toHaveLength(4) // All nodes remain

      // Check tables
      const tableRecord = tableResult.current.tables[networkId]
      expect(tableRecord?.edgeTable?.rows.has('e1')).toBe(false)
      expect(tableRecord?.edgeTable?.rows.has('e0')).toBe(true)
      expect(tableRecord?.edgeTable?.rows.has('e2')).toBe(true)

      // Check view models
      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.edgeViews['e1']).toBeUndefined()
      expect(viewModels?.[0]?.edgeViews['e0']).toBeDefined()

      // Check visual styles
      const updatedVisualStyle =
        visualStyleResult.current.visualStyles[networkId]
      expect(updatedVisualStyle?.edgeLineColor?.bypassMap.has('e1')).toBe(false)
      expect(updatedVisualStyle?.edgeLineColor?.bypassMap.has('e0')).toBe(true)

      // Check summary
      const summary = summaryResult.current.summaries[networkId]
      expect(summary?.nodeCount).toBe(4)
      expect(summary?.edgeCount).toBe(2)
    })
  })
})

