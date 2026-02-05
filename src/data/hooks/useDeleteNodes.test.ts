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
import { useDeleteNodes } from './useDeleteNodes'

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

describe('useDeleteNodes', () => {
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
      { name: 'score', type: ValueTypeName.Integer },
      { name: 'category', type: ValueTypeName.String },
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

  describe('deleteNodes - basic functionality', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'])
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
            edgeCount: 0,
          }),
        )
      })
    })

    it('should delete a single node successfully', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['0'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(1)
      expect(result.deletedEdgeCount).toBe(0)
      expect(result.error).toBeUndefined()

      const network = networkResult.current.networks.get(networkId)
      expect(network?.nodes).toHaveLength(2)
      expect(network?.nodes.find((n) => n.id === '0')).toBeUndefined()
    })

    it('should delete multiple nodes successfully', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['0', '1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(2)
      expect(result.deletedEdgeCount).toBe(0)

      const network = networkResult.current.networks.get(networkId)
      expect(network?.nodes).toHaveLength(1)
      expect(network?.nodes[0].id).toBe('2')
    })

    it('should return error for non-existent network', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes('non-existent', ['0'])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
      expect(result.deletedNodeCount).toBe(0)
      expect(result.deletedEdgeCount).toBe(0)
    })

    it('should return error when no nodes specified', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes(networkId, [])
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No nodes specified')
      expect(result.deletedNodeCount).toBe(0)
    })

    it('should update network summary counts', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const summary = summaryResult.current.summaries[networkId]
      expect(summary?.nodeCount).toBe(2)
      expect(summary?.edgeCount).toBe(0)
    })
  })

  describe('deleteNodes - edge deletion', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2', '3'], [
        { id: 'e0', s: '0', t: '1' },
        { id: 'e1', s: '1', t: '2' },
        { id: 'e2', s: '2', t: '3' },
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
            nodeCount: 4,
            edgeCount: 3,
          }),
        )
      })
    })

    it('should delete edges connected to deleted nodes', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(1)
      expect(result.deletedEdgeCount).toBe(2) // e0 and e1

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(1)
      expect(network?.edges[0].id).toBe('e2')
    })

    it('should delete all edges when deleting multiple nodes', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: networkResult } = renderHook(() => useNetworkStore())

      let result: any

      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['0', '1', '2'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(3)
      expect(result.deletedEdgeCount).toBe(3)

      const network = networkResult.current.networks.get(networkId)
      expect(network?.edges).toHaveLength(0)
    })

    it('should update summary with correct edge count', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: summaryResult } = renderHook(() =>
        useNetworkSummaryStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['1'])
      })

      const summary = summaryResult.current.summaries[networkId]
      expect(summary?.nodeCount).toBe(3)
      expect(summary?.edgeCount).toBe(1)
    })
  })

  describe('deleteNodes - table cleanup', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)

        // Add table rows for nodes
        const nodeRows = new Map()
        nodeRows.set('0', { name: 'Node Zero', score: 0, category: '' })
        nodeRows.set('1', { name: 'Node One', score: 0, category: '' })
        nodeRows.set('2', { name: 'Node Two', score: 0, category: '' })
        tableResult.current.editRows(networkId, 'node', nodeRows)

        // Add table rows for edges
        const edgeRows = new Map()
        edgeRows.set('e0', { name: 'Edge Zero', score: 0, category: '' })
        tableResult.current.editRows(networkId, 'edge', edgeRows)
      })
    })

    it('should delete node table rows', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: tableResult } = renderHook(() => useTableStore())

      // Check initial state
      const tableRecordBefore = tableResult.current.tables[networkId]
      const rowsBefore = Array.from(
        tableRecordBefore?.nodeTable?.rows.keys() || [],
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const tableRecord = tableResult.current.tables[networkId]
      const rowsAfter = Array.from(tableRecord?.nodeTable?.rows.keys() || [])

      expect(tableRecord?.nodeTable?.rows.has('0')).toBe(false)
      expect(tableRecord?.nodeTable?.rows.has('1')).toBe(true)
    })

    it('should delete edge table rows for connected edges', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: tableResult } = renderHook(() => useTableStore())

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const tableRecord = tableResult.current.tables[networkId]
      expect(tableRecord?.edgeTable?.rows.has('e0')).toBe(false)
    })
  })

  describe('deleteNodes - view model cleanup', () => {
    beforeEach(() => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      const network = createTestNetwork(networkId, ['0', '1', '2'], [
        { id: 'e0', s: '0', t: '1' },
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

    it('should delete node views', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.nodeViews['0']).toBeUndefined()
      expect(viewModels?.[0]?.nodeViews['1']).toBeDefined()
      expect(viewModels?.[0]?.nodeViews['2']).toBeDefined()
    })

    it('should delete edge views for connected edges', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.edgeViews['e0']).toBeUndefined()
    })
  })

  describe('deleteNodes - visual style cleanup', () => {
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
          'nodeBackgroundColor',
          ['0', '1'],
          '#FF0000',
        )
        visualStyleResult.current.setBypass(
          networkId,
          'nodeWidth',
          ['0'],
          100,
        )
        visualStyleResult.current.setBypass(
          networkId,
          'edgeLineColor',
          ['e0'],
          '#0000FF',
        )
      })
    })

    it('should clean up node bypasses for deleted nodes', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: visualStyleResult } = renderHook(() =>
        useVisualStyleStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const visualStyle = visualStyleResult.current.visualStyles[networkId]
      const nodeColorBypass = visualStyle?.nodeBackgroundColor?.bypassMap
      const nodeWidthBypass = visualStyle?.nodeWidth?.bypassMap

      expect(nodeColorBypass?.has('0')).toBe(false)
      expect(nodeColorBypass?.has('1')).toBe(true)
      expect(nodeWidthBypass?.has('0')).toBe(false)
    })

    it('should clean up edge bypasses for deleted edges', () => {
      const { result: hookResult } = renderHook(() => useDeleteNodes())
      const { result: visualStyleResult } = renderHook(() =>
        useVisualStyleStore(),
      )

      act(() => {
        hookResult.current.deleteNodes(networkId, ['0'])
      })

      const visualStyle = visualStyleResult.current.visualStyles[networkId]
      const edgeColorBypass = visualStyle?.edgeLineColor?.bypassMap

      expect(edgeColorBypass?.has('e0')).toBe(false)
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
      const { result: hookResult } = renderHook(() => useDeleteNodes())

      const network = createTestNetwork(
        networkId,
        ['0', '1', '2', '3', '4'],
        [
          { id: 'e0', s: '0', t: '1' },
          { id: 'e1', s: '1', t: '2' },
          { id: 'e2', s: '2', t: '3' },
        ],
      )
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
            nodeCount: 5,
            edgeCount: 3,
          }),
        )

        // Add table data
        tableResult.current.setValue(networkId, 'node', '1', 'name', 'Node 1')
        tableResult.current.setValue(networkId, 'node', '2', 'name', 'Node 2')
        tableResult.current.setValue(networkId, 'edge', 'e1', 'name', 'Edge 1')

        // Add bypasses
        visualStyleResult.current.setBypass(
          networkId,
          'nodeBackgroundColor',
          ['1', '2'],
          '#FF0000',
        )
      })

      // Delete node 1, which should cascade to e0 and e1
      let result: any
      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(1)
      expect(result.deletedEdgeCount).toBe(2)

      // Check network
      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.nodes).toHaveLength(4)
      expect(updatedNetwork?.edges).toHaveLength(1)
      expect(updatedNetwork?.edges[0].id).toBe('e2')

      // Check tables
      const tableRecord = tableResult.current.tables[networkId]
      expect(tableRecord?.nodeTable?.rows.has('1')).toBe(false)
      expect(tableRecord?.edgeTable?.rows.has('e0')).toBe(false)
      expect(tableRecord?.edgeTable?.rows.has('e1')).toBe(false)

      // Check view models
      const viewModels = viewModelResult.current.viewModels[networkId]
      expect(viewModels?.[0]?.nodeViews['1']).toBeUndefined()
      expect(viewModels?.[0]?.edgeViews['e0']).toBeUndefined()
      expect(viewModels?.[0]?.edgeViews['e1']).toBeUndefined()

      // Check visual styles
      const updatedVisualStyle =
        visualStyleResult.current.visualStyles[networkId]
      expect(
        updatedVisualStyle?.nodeBackgroundColor?.bypassMap.has('1'),
      ).toBe(false)
      expect(
        updatedVisualStyle?.nodeBackgroundColor?.bypassMap.has('2'),
      ).toBe(true)

      // Check summary
      const summary = summaryResult.current.summaries[networkId]
      expect(summary?.nodeCount).toBe(4)
      expect(summary?.edgeCount).toBe(1)
    })

    it('should handle deleting all nodes', () => {
      const { result: networkResult } = renderHook(() => useNetworkStore())
      const { result: tableResult } = renderHook(() => useTableStore())
      const { result: viewModelResult } = renderHook(() =>
        useViewModelStore(),
      )
      const { result: hookResult } = renderHook(() => useDeleteNodes())

      const network = createTestNetwork(networkId, ['0', '1'], [
        { id: 'e0', s: '0', t: '1' },
      ])
      const nodeTable = createTestTable(networkId)
      const edgeTable = createTestTable(networkId)
      const viewModel = createTestViewModel(networkId, network)

      act(() => {
        networkResult.current.add(network)
        tableResult.current.add(networkId, nodeTable, edgeTable)
        viewModelResult.current.add(networkId, viewModel)
      })

      let result: any
      act(() => {
        result = hookResult.current.deleteNodes(networkId, ['0', '1'])
      })

      expect(result.success).toBe(true)
      expect(result.deletedNodeCount).toBe(2)
      expect(result.deletedEdgeCount).toBe(1)

      const updatedNetwork = networkResult.current.networks.get(networkId)
      expect(updatedNetwork?.nodes).toHaveLength(0)
      expect(updatedNetwork?.edges).toHaveLength(0)
    })
  })
})

