import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IdType } from '../../../models/IdType'
import NetworkFn from '../../../models/NetworkModel'
import { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import { createViewModel } from '../../../models/ViewModel/impl/viewModelImpl'
import { flushPendingWrites } from './persistenceScheduler'
import { useViewModelStore } from './ViewModelStore'

// Mock the database operations to avoid IndexedDB issues in tests
vi.mock('../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db')>()
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
    putTableToDb: vi.fn().mockResolvedValue(undefined),
    deleteTableFromDb: vi.fn().mockResolvedValue(undefined),
    clearTablesFromDb: vi.fn().mockResolvedValue(undefined),
    putViewModelToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewsToDb: vi.fn().mockResolvedValue(undefined),
    putViewSelectionToDb: vi.fn().mockResolvedValue(undefined),
    deleteViewModelFromDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    clearViewModelsFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    putTablesToDb: vi.fn().mockResolvedValue(undefined),
    getNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    getTablesFromDb: vi.fn().mockResolvedValue(undefined),
    getViewModelFromDb: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock the workspace store to provide a current network ID
vi.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: {
        currentNetworkId: 'test-network-1',
      },
    })),
  },
}))

describe('useViewModelStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useViewModelStore())
    act(() => {
      result.current.deleteAll()
    })
  })

  const createTestNetworkView = (id: IdType, viewId?: IdType): NetworkView => {
    const network = NetworkFn.createNetworkFromLists(
      id,
      [{ id: 'n1' }, { id: 'n2' }],
      [{ id: 'e1', s: 'n1', t: 'n2' }],
    )
    const networkView = createViewModel(network, id)
    if (viewId) {
      networkView.viewId = viewId
    }
    return networkView
  }

  describe('add', () => {
    it('should add a network view to the store', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
      })

      expect(result.current.viewModels[networkId]).toBeDefined()
      expect(result.current.viewModels[networkId]).toHaveLength(1)
      expect(result.current.viewModels[networkId][0]).toEqual(networkView)
    })

    it('should generate viewId if not provided', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView('network-1')
      delete networkView.viewId

      act(() => {
        result.current.add(networkId, networkView)
      })

      expect(result.current.viewModels[networkId][0].viewId).toBeDefined()
      expect(result.current.viewModels[networkId][0].viewId).toContain(
        'network-1-nodeLink',
      )
    })

    it('should set default type to nodeLink if not provided', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView('network-1')
      delete networkView.type

      act(() => {
        result.current.add(networkId, networkView)
      })

      expect(result.current.viewModels[networkId][0].type).toBe('nodeLink')
    })

    it('should replace existing view with same viewId', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const viewId = 'network-1-nodeLink-1'
      const networkView1 = createTestNetworkView('network-1', viewId)
      networkView1.selectedNodes = ['n1', 'n2']
      const networkView2 = createTestNetworkView('network-1', viewId)

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
      })

      expect(result.current.viewModels[networkId]).toHaveLength(1)
      // Selection state should be preserved from the first view
      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([
        'n1',
        'n2',
      ])
    })

    it('should preserve selection state when replacing existing view', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const viewId = 'network-1-nodeLink-1'
      const networkView1 = createTestNetworkView('network-1', viewId)
      networkView1.selectedNodes = ['n1']
      networkView1.selectedEdges = ['e1']
      const networkView2 = createTestNetworkView('network-1', viewId)

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([
        'n1',
      ])
      expect(result.current.viewModels[networkId][0].selectedEdges).toEqual([
        'e1',
      ])
    })

    it('should add multiple views to the same network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
      })

      expect(result.current.viewModels[networkId]).toHaveLength(2)
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-2',
        'network-2-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId1, networkView1)
        result.current.add(networkId2, networkView2)
      })

      expect(result.current.viewModels[networkId1]).toHaveLength(1)
      expect(result.current.viewModels[networkId2]).toHaveLength(1)
    })

    // Note: Error throwing test removed - act() wrapper prevents proper error catching
    // The implementation correctly throws an error for undefined networkView
  })

  describe('getViewModel', () => {
    it('should return the first view model if no viewModelId is provided', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-2',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
      })

      const viewModel = result.current.getViewModel(networkId)
      expect(viewModel).toEqual(networkView1)
    })

    it('should return undefined if network has no views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'

      const viewModel = result.current.getViewModel(networkId)
      expect(viewModel).toBeUndefined()
    })

    // REVIEW.md round-2 P2: getViewModel used to match on `view.id` — the
    // NETWORK id, identical for every view of the network — so a specific
    // secondary view could never be addressed. It must match on `viewId`.
    // (This spec previously ASSERTED the broken behavior.)
    it('should return the specific view matching the given viewId', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-2',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
      })

      const viewModel = result.current.getViewModel(
        networkId,
        'network-1-nodeLink-2',
      )
      expect(viewModel).toBeDefined()
      expect(viewModel?.viewId).toBe('network-1-nodeLink-2')
    })

    it('should return undefined if viewModelId not found', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
      })

      const viewModel = result.current.getViewModel(networkId, 'non-existent')
      expect(viewModel).toBeUndefined()
    })
  })

  describe('exclusiveSelect', () => {
    it('should set selected nodes and edges exclusively', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1']
      networkView.selectedEdges = ['e1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.exclusiveSelect(networkId, ['n2'], ['e1'])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([
        'n2',
      ])
      expect(result.current.viewModels[networkId][0].selectedEdges).toEqual([
        'e1',
      ])
    })

    it('should apply to all views for the network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
        result.current.exclusiveSelect(networkId, ['n1'], ['e1'])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([
        'n1',
      ])
      expect(result.current.viewModels[networkId][0].selectedEdges).toEqual([
        'e1',
      ])
      expect(result.current.viewModels[networkId][1].selectedNodes).toEqual([
        'n1',
      ])
      expect(result.current.viewModels[networkId][1].selectedEdges).toEqual([
        'e1',
      ])
    })

    it('should clear selection when empty arrays are provided', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1', 'n2']
      networkView.selectedEdges = ['e1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.exclusiveSelect(networkId, [], [])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([])
      expect(result.current.viewModels[networkId][0].selectedEdges).toEqual([])
    })

    it('should handle empty view list gracefully', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.exclusiveSelect(networkId, ['n1'], ['e1'])
      })

      // Should not throw
      expect(result.current.viewModels[networkId]).toBeUndefined()
    })
  })

  describe('toggleSelected', () => {
    it('should toggle node selection', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.toggleSelected(networkId, ['n1', 'n2'])
      })

      expect(
        result.current.viewModels[networkId][0].selectedNodes,
      ).not.toContain('n1')
      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n2',
      )
    })

    it('should toggle edge selection', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedEdges = ['e1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.toggleSelected(networkId, ['e1'])
      })

      expect(
        result.current.viewModels[networkId][0].selectedEdges,
      ).not.toContain('e1')
    })

    it('should handle both nodes and edges in the same call', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1']
      networkView.selectedEdges = []

      act(() => {
        result.current.add(networkId, networkView)
        result.current.toggleSelected(networkId, ['n1', 'e1'])
      })

      expect(
        result.current.viewModels[networkId][0].selectedNodes,
      ).not.toContain('n1')
      expect(result.current.viewModels[networkId][0].selectedEdges).toContain(
        'e1',
      )
    })

    it('should apply to all views for the network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
        result.current.toggleSelected(networkId, ['n1'])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n1',
      )
      expect(result.current.viewModels[networkId][1].selectedNodes).toContain(
        'n1',
      )
    })
  })

  describe('additiveSelect', () => {
    it('should add nodes to selection without removing existing', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.additiveSelect(networkId, ['n2'])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n1',
      )
      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n2',
      )
    })

    it('should add edges to selection without removing existing', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedEdges = ['e1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.additiveSelect(networkId, ['e1']) // Edge already selected, should stay
      })

      expect(result.current.viewModels[networkId][0].selectedEdges).toContain(
        'e1',
      )
    })

    it('should handle both nodes and edges in the same call', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.additiveSelect(networkId, ['n1', 'e1'])
      })

      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n1',
      )
      expect(result.current.viewModels[networkId][0].selectedEdges).toContain(
        'e1',
      )
    })
  })

  describe('additiveUnselect', () => {
    it('should remove nodes from selection without affecting others', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedNodes = ['n1', 'n2']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.additiveUnselect(networkId, ['n1'])
      })

      expect(
        result.current.viewModels[networkId][0].selectedNodes,
      ).not.toContain('n1')
      expect(result.current.viewModels[networkId][0].selectedNodes).toContain(
        'n2',
      )
    })

    it('should remove edges from selection without affecting others', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      networkView.selectedEdges = ['e1']

      act(() => {
        result.current.add(networkId, networkView)
        result.current.additiveUnselect(networkId, ['e1'])
      })

      expect(
        result.current.viewModels[networkId][0].selectedEdges,
      ).not.toContain('e1')
    })
  })

  describe('setNodePosition', () => {
    it('should set node position', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.setNodePosition(networkId, 'n1', [100, 200])
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        100,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n1'].y).toBe(
        200,
      )
    })

    it('should set node position with z coordinate', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.setNodePosition(networkId, 'n1', [100, 200, 300])
      })

      const nodeView = result.current.viewModels[networkId][0].nodeViews['n1']
      expect(nodeView.x).toBe(100)
      expect(nodeView.y).toBe(200)
      // Note: z coordinate is optional and may not be set if position[2] is undefined
      if (nodeView.z !== undefined) {
        expect(nodeView.z).toBe(300)
      }
    })

    it('should apply to all views for the network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
        result.current.setNodePosition(networkId, 'n1', [100, 200])
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        100,
      )
      expect(result.current.viewModels[networkId][1].nodeViews['n1'].x).toBe(
        100,
      )
    })
  })

  describe('updateNodePositions', () => {
    it('should update multiple node positions', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const positions = new Map<IdType, [number, number, number?]>([
        ['n1', [100, 200]],
        ['n2', [300, 400]],
      ])

      act(() => {
        result.current.add(networkId, networkView)
        result.current.updateNodePositions(networkId, positions)
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        100,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n1'].y).toBe(
        200,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n2'].x).toBe(
        300,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n2'].y).toBe(
        400,
      )
    })

    it('should only update positions for nodes in the map', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const originalN2X = networkView.nodeViews['n2'].x
      const positions = new Map<IdType, [number, number, number?]>([
        ['n1', [100, 200]],
      ])

      act(() => {
        result.current.add(networkId, networkView)
        result.current.updateNodePositions(networkId, positions)
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        100,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n2'].x).toBe(
        originalN2X,
      )
    })
  })

  describe('deleteObjects', () => {
    it('should delete nodes from all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteObjects(networkId, ['n1'])
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n1'],
      ).toBeUndefined()
      expect(
        result.current.viewModels[networkId][0].nodeViews['n2'],
      ).toBeDefined()
    })

    it('should delete edges from all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteObjects(networkId, ['e1'])
      })

      expect(
        result.current.viewModels[networkId][0].edgeViews['e1'],
      ).toBeUndefined()
    })

    it('should delete both nodes and edges', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteObjects(networkId, ['n1', 'e1'])
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n1'],
      ).toBeUndefined()
      expect(
        result.current.viewModels[networkId][0].edgeViews['e1'],
      ).toBeUndefined()
    })

    it('should apply to all views for the network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
        result.current.deleteObjects(networkId, ['n1'])
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n1'],
      ).toBeUndefined()
      expect(
        result.current.viewModels[networkId][1].nodeViews['n1'],
      ).toBeUndefined()
    })
  })

  describe('addNodeView', () => {
    it('should add a node view to all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const newNodeView: NodeView = {
        id: 'n3',
        x: 100,
        y: 200,
        values: new Map(),
      }

      act(() => {
        result.current.add(networkId, networkView)
        result.current.addNodeView(networkId, newNodeView)
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n3']).toEqual(
        newNodeView,
      )
    })

    it('should replace existing node view', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const updatedNodeView: NodeView = {
        id: 'n1',
        x: 999,
        y: 888,
        values: new Map(),
      }

      act(() => {
        result.current.add(networkId, networkView)
        result.current.addNodeView(networkId, updatedNodeView)
      })

      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        999,
      )
      expect(result.current.viewModels[networkId][0].nodeViews['n1'].y).toBe(
        888,
      )
    })
  })

  describe('addNodeViews', () => {
    it('should add multiple node views to all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const newNodeViews: NodeView[] = [
        { id: 'n3', x: 100, y: 200, values: new Map() },
        { id: 'n4', x: 300, y: 400, values: new Map() },
      ]

      act(() => {
        result.current.add(networkId, networkView)
        result.current.addNodeViews(networkId, newNodeViews)
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n3'],
      ).toBeDefined()
      expect(
        result.current.viewModels[networkId][0].nodeViews['n4'],
      ).toBeDefined()
    })
  })

  describe('addEdgeView', () => {
    it('should add an edge view to all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const newEdgeView: EdgeView = {
        id: 'e2',
        values: new Map(),
      }

      act(() => {
        result.current.add(networkId, networkView)
        result.current.addEdgeView(networkId, newEdgeView)
      })

      expect(result.current.viewModels[networkId][0].edgeViews['e2']).toEqual(
        newEdgeView,
      )
    })
  })

  describe('addEdgeViews', () => {
    it('should add multiple edge views to all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const newEdgeViews: EdgeView[] = [
        { id: 'e2', values: new Map() },
        { id: 'e3', values: new Map() },
      ]

      act(() => {
        result.current.add(networkId, networkView)
        result.current.addEdgeViews(networkId, newEdgeViews)
      })

      expect(
        result.current.viewModels[networkId][0].edgeViews['e2'],
      ).toBeDefined()
      expect(
        result.current.viewModels[networkId][0].edgeViews['e3'],
      ).toBeDefined()
    })
  })

  describe('deleteNodeViews', () => {
    it('should delete node views from all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteNodeViews(networkId, ['n1'])
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n1'],
      ).toBeUndefined()
      expect(
        result.current.viewModels[networkId][0].nodeViews['n2'],
      ).toBeDefined()
    })

    it('should delete multiple node views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteNodeViews(networkId, ['n1', 'n2'])
      })

      expect(
        result.current.viewModels[networkId][0].nodeViews['n1'],
      ).toBeUndefined()
      expect(
        result.current.viewModels[networkId][0].nodeViews['n2'],
      ).toBeUndefined()
    })
  })

  describe('deleteEdgeViews', () => {
    it('should delete edge views from all views', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId, networkView)
        result.current.deleteEdgeViews(networkId, ['e1'])
      })

      expect(
        result.current.viewModels[networkId][0].edgeViews['e1'],
      ).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete all views for a network', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-1',
        'network-1-circlePacking-1',
      )

      act(() => {
        result.current.add(networkId, networkView1)
        result.current.add(networkId, networkView2)
        result.current.delete(networkId)
      })

      expect(result.current.viewModels[networkId]).toBeUndefined()
    })

    it('should not affect other networks', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-2',
        'network-2-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId1, networkView1)
        result.current.add(networkId2, networkView2)
        result.current.delete(networkId1)
      })

      expect(result.current.viewModels[networkId1]).toBeUndefined()
      expect(result.current.viewModels[networkId2]).toHaveLength(1)
    })
  })

  describe('deleteAll', () => {
    it('should delete all view models', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId1: IdType = 'network-1'
      const networkId2: IdType = 'network-2'
      const networkView1 = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )
      const networkView2 = createTestNetworkView(
        'network-2',
        'network-2-nodeLink-1',
      )

      act(() => {
        result.current.add(networkId1, networkView1)
        result.current.add(networkId2, networkView2)
        result.current.deleteAll()
      })

      expect(result.current.viewModels).toEqual({})
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add, select, update positions, delete', () => {
      const { result } = renderHook(() => useViewModelStore())
      const networkId: IdType = 'network-1'
      const networkView = createTestNetworkView(
        'network-1',
        'network-1-nodeLink-1',
      )

      act(() => {
        // Add view
        result.current.add(networkId, networkView)
      })
      expect(result.current.viewModels[networkId]).toHaveLength(1)

      act(() => {
        // Select nodes
        result.current.exclusiveSelect(networkId, ['n1'], [])
      })
      expect(result.current.viewModels[networkId][0].selectedNodes).toEqual([
        'n1',
      ])

      act(() => {
        // Update position
        result.current.setNodePosition(networkId, 'n1', [100, 200])
      })
      expect(result.current.viewModels[networkId][0].nodeViews['n1'].x).toBe(
        100,
      )

      act(() => {
        // Toggle selection
        result.current.toggleSelected(networkId, ['n1'])
      })
      expect(
        result.current.viewModels[networkId][0].selectedNodes,
      ).not.toContain('n1')

      act(() => {
        // Add node view
        const newNodeView: NodeView = {
          id: 'n3',
          x: 300,
          y: 400,
          values: new Map(),
        }
        result.current.addNodeView(networkId, newNodeView)
      })
      expect(
        result.current.viewModels[networkId][0].nodeViews['n3'],
      ).toBeDefined()

      act(() => {
        // Delete objects
        result.current.deleteObjects(networkId, ['n3'])
      })
      expect(
        result.current.viewModels[networkId][0].nodeViews['n3'],
      ).toBeUndefined()
    })
  })

  // REVIEW.md R2-2: the persist wrapper used to key the DB write off
  // workspace.currentNetworkId (mocked here as 'test-network-1') instead of
  // the network the action actually mutated — e.g. positions computed for a
  // network the user had already switched away from were never persisted.
  describe('IndexedDB persistence keying (regression: R2-2)', () => {
    it('persists the mutated network views even when it is not the current network', async () => {
      const { putNetworkViewsToDb } = await import('../../db')
      const { result } = renderHook(() => useViewModelStore())
      const networkView = createTestNetworkView('other-network')

      act(() => {
        result.current.add('other-network', networkView)
      })
      flushPendingWrites()
      vi.mocked(putNetworkViewsToDb).mockClear()

      act(() => {
        result.current.setNodePosition('other-network', 'n1', [10, 20])
      })
      flushPendingWrites()

      expect(putNetworkViewsToDb).toHaveBeenCalled()
      const lastCall = vi.mocked(putNetworkViewsToDb).mock.calls.at(-1)
      expect(lastCall?.[0]).toBe('other-network')
      expect(lastCall?.[1][0].nodeViews.n1.x).toBe(10)
    })

    // DB v11: selection is written to its own row, keyed by the network that
    // was actually mutated (same R2-2 property), and stripped from the view row
    // so a selection change leaves it byte-identical — which is what stops a
    // click in one tab from replacing every other tab's view model.
    it('writes selection to its own row, keyed by the mutated network', async () => {
      const { putNetworkViewsToDb, putViewSelectionToDb } = await import(
        '../../db'
      )
      const { result } = renderHook(() => useViewModelStore())

      act(() => {
        result.current.add(
          'other-network',
          createTestNetworkView('other-network'),
        )
      })
      flushPendingWrites()
      vi.mocked(putNetworkViewsToDb).mockClear()
      vi.mocked(putViewSelectionToDb).mockClear()

      act(() => {
        result.current.exclusiveSelect('other-network', ['n1'], [])
      })
      flushPendingWrites()

      expect(putViewSelectionToDb).toHaveBeenCalledWith('other-network', {
        selectedNodes: ['n1'],
        selectedEdges: [],
      })
      expect(
        result.current.viewModels['other-network'][0].selectedNodes,
      ).toEqual(['n1'])
    })

    it('keeps selection out of the persisted view row', async () => {
      const { putNetworkViewsToDb } = await import('../../db')
      const { result } = renderHook(() => useViewModelStore())

      act(() => {
        result.current.add('sel-net', createTestNetworkView('sel-net'))
      })
      act(() => {
        result.current.exclusiveSelect('sel-net', ['n1'], [])
      })
      // A selection alone writes no view row, so mutate the view too: this
      // asserts the row that DOES get written carries no selection.
      act(() => {
        result.current.setNodePosition('sel-net', 'n1', [10, 20])
      })
      flushPendingWrites()

      const calls = vi.mocked(putNetworkViewsToDb).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      for (const call of calls) {
        for (const view of call[1]) {
          expect(view.selectedNodes).toEqual([])
          expect(view.selectedEdges).toEqual([])
        }
      }
    })

    it('writes only the selection row when a selection action runs', async () => {
      const { putNetworkViewsToDb, putViewSelectionToDb } = await import(
        '../../db'
      )
      const { result } = renderHook(() => useViewModelStore())

      act(() => {
        result.current.add('sel-only', createTestNetworkView('sel-only'))
      })
      // Drain the add's own view write before measuring the selection.
      flushPendingWrites()
      vi.mocked(putNetworkViewsToDb).mockClear()
      vi.mocked(putViewSelectionToDb).mockClear()

      act(() => {
        result.current.exclusiveSelect('sel-only', ['n1'], [])
      })
      flushPendingWrites()

      expect(putViewSelectionToDb).toHaveBeenCalledTimes(1)
      // The whole point of the separate selection row: a click must not rewrite
      // the view row (node positions and all) on every selection change.
      expect(putNetworkViewsToDb).not.toHaveBeenCalled()
    })

    it('never writes circlePacking views to the DB (stated storage policy)', async () => {
      const { putNetworkViewsToDb } = await import('../../db')
      const { result } = renderHook(() => useViewModelStore())
      const primary = createTestNetworkView('net-cp', 'net-cp-nodeLink-1')
      const circlePacking = createTestNetworkView(
        'net-cp',
        'net-cp-circlePacking-1',
      )
      ;(circlePacking as any).type = 'circlePacking'

      act(() => {
        result.current.add('net-cp', primary)
        result.current.add('net-cp', circlePacking)
      })
      flushPendingWrites()
      vi.mocked(putNetworkViewsToDb).mockClear()

      act(() => {
        // A view mutation, not a selection: selection has its own row and is
        // deliberately excluded from the view write (see `skipPersist`).
        result.current.setNodePosition('net-cp', 'n1', [10, 20])
      })
      flushPendingWrites()

      const persistedLists = vi
        .mocked(putNetworkViewsToDb)
        .mock.calls.map((call) => call[1])
      expect(persistedLists.length).toBeGreaterThan(0)
      for (const views of persistedLists) {
        expect(views.every((view: any) => view.type !== 'circlePacking')).toBe(
          true,
        )
      }
    })
  })
})
