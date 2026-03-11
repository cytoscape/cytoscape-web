/**
 * Tests for ViewModel implementation
 *
 * These tests verify the behavior of view model creation and manipulation functions.
 */
import { Cx2 } from '../../CxModel/Cx2'
import { Edge as CxEdge } from '../../CxModel/Cx2/CoreAspects/Edge'
import { Node as CxNode } from '../../CxModel/Cx2/CoreAspects/Node'
import { createViewModelFromCX } from '../../CxModel/impl/converters'
import { IdType } from '../../IdType'
import { Edge,Network, Node } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import { EdgeView,NetworkView, NodeView } from '../index'
import {
  additiveSelect,
  additiveUnselect,
  addEdgeViewDirect,
  addEdgeViewsToModel,
  addEdgeViewToModel,
  addNodeViewDirect,
  addNodeViewsToModel,
  addNodeViewToModel,
  addNodeViewWithPosition,
  createViewModel,
  deleteEdgeViews,
  deleteNodeViews,
  deleteObjects,
  exclusiveSelect,
  getNetworkViewId,
  setNodePosition,
  toggleSelected,
  updateNodePositions,
} from './viewModelImpl'

describe('ViewModel Implementation', () => {
  describe('createViewModel', () => {
    it('should create a view model from an empty network', () => {
      const network = NetworkFn.createNetwork('test-network-1')
      const viewModel = createViewModel(network)

      expect(viewModel.id).toBe('test-network-1')
      expect(viewModel.nodeViews).toEqual({})
      expect(viewModel.edgeViews).toEqual({})
      expect(viewModel.selectedNodes).toEqual([])
      expect(viewModel.selectedEdges).toEqual([])
      expect(viewModel.values).toBeInstanceOf(Map)
    })

    it('should create node views for all nodes in the network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-2',
        [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        [],
      )
      const viewModel = createViewModel(network)

      expect(Object.keys(viewModel.nodeViews)).toHaveLength(3)
      expect(viewModel.nodeViews['n1']).toBeDefined()
      expect(viewModel.nodeViews['n2']).toBeDefined()
      expect(viewModel.nodeViews['n3']).toBeDefined()

      // Check node view structure
      const nodeView1 = viewModel.nodeViews['n1']
      expect(nodeView1.id).toBe('n1')
      expect(nodeView1.x).toBe(0)
      expect(nodeView1.y).toBe(0)
      expect(nodeView1.values).toBeInstanceOf(Map)
      expect(nodeView1.z).toBeUndefined()
    })

    it('should create edge views for all edges in the network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-3',
        [{ id: 'n1' }, { id: 'n2' }],
        [
          { id: 'e1', s: 'n1', t: 'n2' },
          { id: 'e2', s: 'n2', t: 'n1' },
        ],
      )
      const viewModel = createViewModel(network)

      expect(Object.keys(viewModel.edgeViews)).toHaveLength(2)
      expect(viewModel.edgeViews['e1']).toBeDefined()
      expect(viewModel.edgeViews['e2']).toBeDefined()

      // Check edge view structure
      const edgeView1 = viewModel.edgeViews['e1']
      expect(edgeView1.id).toBe('e1')
      expect(edgeView1.values).toBeInstanceOf(Map)
    })

    it('should create views for both nodes and edges', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-4',
        [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        [
          { id: 'e1', s: 'n1', t: 'n2' },
          { id: 'e2', s: 'n2', t: 'n3' },
        ],
      )
      const viewModel = createViewModel(network)

      expect(Object.keys(viewModel.nodeViews)).toHaveLength(3)
      expect(Object.keys(viewModel.edgeViews)).toHaveLength(2)
      expect(viewModel.id).toBe('test-network-4')
    })

    it('should initialize all node views with default positions (0, 0)', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-5',
        [{ id: 'n1' }, { id: 'n2' }],
        [],
      )
      const viewModel = createViewModel(network)

      expect(viewModel.nodeViews['n1'].x).toBe(0)
      expect(viewModel.nodeViews['n1'].y).toBe(0)
      expect(viewModel.nodeViews['n2'].x).toBe(0)
      expect(viewModel.nodeViews['n2'].y).toBe(0)
    })

    it('should initialize empty values maps for all views', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-6',
        [{ id: 'n1' }],
        [{ id: 'e1', s: 'n1', t: 'n1' }],
      )
      const viewModel = createViewModel(network)

      expect(viewModel.values.size).toBe(0)
      expect(viewModel.nodeViews['n1'].values.size).toBe(0)
      expect(viewModel.edgeViews['e1'].values.size).toBe(0)
    })
  })

  describe('createViewModelFromCX', () => {
    it('should create a view model from CX2 format with nodes and edges', () => {
      const networkId = 'test-network-cx-1'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 3 },
          ],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      expect(viewModel.id).toBe(networkId)
      expect(Object.keys(viewModel.nodeViews)).toHaveLength(3)
      expect(Object.keys(viewModel.edgeViews)).toHaveLength(2)
    })

    it('should use node positions from CX format if available', () => {
      const networkId = 'test-network-cx-2'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [
            { id: 1, x: 10, y: 20 },
            { id: 2, x: 30, y: 40 },
          ],
        },
        {
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      expect(viewModel.nodeViews['1'].x).toBe(10)
      expect(viewModel.nodeViews['1'].y).toBe(20)
      expect(viewModel.nodeViews['2'].x).toBe(30)
      expect(viewModel.nodeViews['2'].y).toBe(40)
    })

    it('should use default positions (0, 0) when node positions are not in CX', () => {
      const networkId = 'test-network-cx-3'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [{ id: 1 }],
        },
        {
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      expect(viewModel.nodeViews['1'].x).toBe(0)
      expect(viewModel.nodeViews['1'].y).toBe(0)
    })

    it('should include z-coordinate when present in CX node', () => {
      const networkId = 'test-network-cx-4'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [
            { id: 1, x: 10, y: 20, z: 5 },
            { id: 2, x: 30, y: 40 },
          ],
        },
        {
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      expect(viewModel.nodeViews['1'].z).toBe(5)
      expect(viewModel.nodeViews['2'].z).toBeUndefined()
    })

    it('should translate edge IDs using translateCXEdgeId', () => {
      const networkId = 'test-network-cx-5'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [{ id: 1 }, { id: 2 }],
        },
        {
          edges: [
            { id: 1, s: 1, t: 2 },
            { id: 2, s: 2, t: 1 },
          ],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      // Edge IDs should be translated with 'e' prefix
      expect(viewModel.edgeViews['e1']).toBeDefined()
      expect(viewModel.edgeViews['e2']).toBeDefined()
      expect(viewModel.edgeViews['e1'].id).toBe('e1')
      expect(viewModel.edgeViews['e2'].id).toBe('e2')
    })

    it('should handle empty CX2 format', () => {
      const networkId = 'test-network-cx-6'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      expect(viewModel.id).toBe(networkId)
      expect(Object.keys(viewModel.nodeViews)).toHaveLength(0)
      expect(Object.keys(viewModel.edgeViews)).toHaveLength(0)
    })

    it('should handle null z-coordinate correctly', () => {
      const networkId = 'test-network-cx-7'
      const cx2: Cx2 = [
        {
          CXVersion: '2.0',
        },
        {
          nodes: [{ id: 1, x: 10, y: 20, z: null as any }],
        },
        {
          edges: [],
        },
        {
          status: [
            {
              success: true,
            },
          ],
        },
      ]

      const viewModel = createViewModelFromCX(networkId, cx2)

      // z should not be included when null
      expect(viewModel.nodeViews['1'].z).toBeUndefined()
    })
  })

  describe('addNodeViewsToModel', () => {
    it('should add multiple node views to an existing view model', () => {
      const network = NetworkFn.createNetwork('test-network-add-1')
      const viewModel = createViewModel(network)

      const nodeViews: NodeView[] = [
        {
          id: 'n1',
          x: 10,
          y: 20,
          values: new Map(),
        },
        {
          id: 'n2',
          x: 30,
          y: 40,
          values: new Map(),
        },
      ]

      const updatedViewModel = addNodeViewsToModel(viewModel, nodeViews)

      expect(updatedViewModel.nodeViews['n1']).toBeDefined()
      expect(updatedViewModel.nodeViews['n2']).toBeDefined()
      expect(updatedViewModel.nodeViews['n1'].x).toBe(10)
      expect(updatedViewModel.nodeViews['n1'].y).toBe(20)
      expect(updatedViewModel.nodeViews['n2'].x).toBe(30)
      expect(updatedViewModel.nodeViews['n2'].y).toBe(40)
    })

    it('should overwrite existing node views with the same ID', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-add-2',
        [{ id: 'n1' }],
        [],
      )
      const viewModel = createViewModel(network)

      // Original view has x: 0, y: 0
      expect(viewModel.nodeViews['n1'].x).toBe(0)
      expect(viewModel.nodeViews['n1'].y).toBe(0)

      const nodeViews: NodeView[] = [
        {
          id: 'n1',
          x: 100,
          y: 200,
          values: new Map(),
        },
      ]

      const updatedViewModel = addNodeViewsToModel(viewModel, nodeViews)

      expect(updatedViewModel.nodeViews['n1'].x).toBe(100)
      expect(updatedViewModel.nodeViews['n1'].y).toBe(200)
    })

    it('should handle empty array of node views', () => {
      const network = NetworkFn.createNetwork('test-network-add-3')
      const viewModel = createViewModel(network)

      const updatedViewModel = addNodeViewsToModel(viewModel, [])

      expect(updatedViewModel).toBe(viewModel)
      expect(Object.keys(updatedViewModel.nodeViews)).toHaveLength(0)
    })
  })

  describe('addEdgeViewsToModel', () => {
    it('should add multiple edge views to an existing view model', () => {
      const network = NetworkFn.createNetwork('test-network-add-edge-1')
      const viewModel = createViewModel(network)

      const edgeViews: EdgeView[] = [
        {
          id: 'e1',
          values: new Map(),
        },
        {
          id: 'e2',
          values: new Map(),
        },
      ]

      const updatedViewModel = addEdgeViewsToModel(viewModel, edgeViews)

      expect(updatedViewModel.edgeViews['e1']).toBeDefined()
      expect(updatedViewModel.edgeViews['e2']).toBeDefined()
      expect(updatedViewModel.edgeViews['e1'].id).toBe('e1')
      expect(updatedViewModel.edgeViews['e2'].id).toBe('e2')
    })

    it('should overwrite existing edge views with the same ID', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-add-edge-2',
        [{ id: 'n1' }, { id: 'n2' }],
        [{ id: 'e1', s: 'n1', t: 'n2' }],
      )
      const viewModel = createViewModel(network)

      expect(viewModel.edgeViews['e1']).toBeDefined()

      const edgeViews: EdgeView[] = [
        {
          id: 'e1',
          values: new Map([['edgeWidth', 5]]),
        },
      ]

      const updatedViewModel = addEdgeViewsToModel(viewModel, edgeViews)

      expect(updatedViewModel.edgeViews['e1'].values.get('edgeWidth')).toBe(5)
    })

    it('should handle empty array of edge views', () => {
      const network = NetworkFn.createNetwork('test-network-add-edge-3')
      const viewModel = createViewModel(network)

      const updatedViewModel = addEdgeViewsToModel(viewModel, [])

      expect(updatedViewModel).toBe(viewModel)
      expect(Object.keys(updatedViewModel.edgeViews)).toHaveLength(0)
    })
  })

  describe('addNodeViewToModel', () => {
    it('should add a single node view from CX node', () => {
      const network = NetworkFn.createNetwork('test-network-add-node-1')
      const viewModel = createViewModel(network)

      const cxNode: CxNode = {
        id: 1,
        x: 50,
        y: 60,
      }

      const updatedViewModel = addNodeViewToModel(viewModel, cxNode)

      expect(updatedViewModel.nodeViews['1']).toBeDefined()
      expect(updatedViewModel.nodeViews['1'].id).toBe('1')
      expect(updatedViewModel.nodeViews['1'].x).toBe(50)
      expect(updatedViewModel.nodeViews['1'].y).toBe(60)
      expect(updatedViewModel.nodeViews['1'].values).toBeInstanceOf(Map)
    })

    it('should include z-coordinate when present in CX node', () => {
      const network = NetworkFn.createNetwork('test-network-add-node-2')
      const viewModel = createViewModel(network)

      const cxNode: CxNode = {
        id: 1,
        x: 10,
        y: 20,
        z: 5,
      }

      const updatedViewModel = addNodeViewToModel(viewModel, cxNode)

      expect(updatedViewModel.nodeViews['1'].z).toBe(5)
    })

    it('should use default positions when x/y are not provided', () => {
      const network = NetworkFn.createNetwork('test-network-add-node-3')
      const viewModel = createViewModel(network)

      const cxNode: CxNode = {
        id: 1,
      }

      const updatedViewModel = addNodeViewToModel(viewModel, cxNode)

      expect(updatedViewModel.nodeViews['1'].x).toBe(0)
      expect(updatedViewModel.nodeViews['1'].y).toBe(0)
      expect(updatedViewModel.nodeViews['1'].z).toBeUndefined()
    })

    it('should overwrite existing node view with the same ID', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-add-node-4',
        [{ id: '1' }],
        [],
      )
      const viewModel = createViewModel(network)

      expect(viewModel.nodeViews['1'].x).toBe(0)
      expect(viewModel.nodeViews['1'].y).toBe(0)

      const cxNode: CxNode = {
        id: 1,
        x: 100,
        y: 200,
      }

      const updatedViewModel = addNodeViewToModel(viewModel, cxNode)

      expect(updatedViewModel.nodeViews['1'].x).toBe(100)
      expect(updatedViewModel.nodeViews['1'].y).toBe(200)
    })
  })

  describe('addEdgeViewToModel', () => {
    it('should add a single edge view from CX edge', () => {
      const network = NetworkFn.createNetwork('test-network-add-edge-single-1')
      const viewModel = createViewModel(network)

      const cxEdge: CxEdge = {
        id: 1,
        s: 1,
        t: 2,
      }

      const updatedViewModel = addEdgeViewToModel(viewModel, cxEdge)

      // Edge ID should be translated with 'e' prefix
      expect(updatedViewModel.edgeViews['e1']).toBeDefined()
      expect(updatedViewModel.edgeViews['e1'].id).toBe('e1')
      expect(updatedViewModel.edgeViews['e1'].values).toBeInstanceOf(Map)
    })

    it('should translate edge ID correctly', () => {
      const network = NetworkFn.createNetwork('test-network-add-edge-single-2')
      const viewModel = createViewModel(network)

      const cxEdge: CxEdge = {
        id: 123,
        s: 1,
        t: 2,
      }

      const updatedViewModel = addEdgeViewToModel(viewModel, cxEdge)

      expect(updatedViewModel.edgeViews['e123']).toBeDefined()
      expect(updatedViewModel.edgeViews['e123'].id).toBe('e123')
    })

    it('should overwrite existing edge view with the same translated ID', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-add-edge-single-3',
        [{ id: 'n1' }, { id: 'n2' }],
        [{ id: 'e1', s: 'n1', t: 'n2' }],
      )
      const viewModel = createViewModel(network)

      expect(viewModel.edgeViews['e1']).toBeDefined()

      const cxEdge: CxEdge = {
        id: 1,
        s: 1,
        t: 2,
      }

      const updatedViewModel = addEdgeViewToModel(viewModel, cxEdge)

      // Should still have the edge view (overwritten)
      expect(updatedViewModel.edgeViews['e1']).toBeDefined()
      expect(updatedViewModel.edgeViews['e1'].id).toBe('e1')
    })
  })

  describe('Integration tests', () => {
    it('should create a complete view model with nodes and edges from network', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-integration-1',
        [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
        [
          { id: 'e1', s: 'n1', t: 'n2' },
          { id: 'e2', s: 'n2', t: 'n3' },
          { id: 'e3', s: 'n3', t: 'n1' },
        ],
      )

      const viewModel = createViewModel(network)

      expect(viewModel.id).toBe('test-network-integration-1')
      expect(Object.keys(viewModel.nodeViews)).toHaveLength(3)
      expect(Object.keys(viewModel.edgeViews)).toHaveLength(3)
      expect(viewModel.selectedNodes).toEqual([])
      expect(viewModel.selectedEdges).toEqual([])

      // Verify all nodes have views
      expect(viewModel.nodeViews['n1']).toBeDefined()
      expect(viewModel.nodeViews['n2']).toBeDefined()
      expect(viewModel.nodeViews['n3']).toBeDefined()

      // Verify all edges have views
      expect(viewModel.edgeViews['e1']).toBeDefined()
      expect(viewModel.edgeViews['e2']).toBeDefined()
      expect(viewModel.edgeViews['e3']).toBeDefined()
    })

    it('should combine createViewModel and addNodeViewsToModel operations', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-integration-2',
        [{ id: 'n1' }],
        [],
      )

      let viewModel = createViewModel(network)
      expect(viewModel.nodeViews['n1'].x).toBe(0)
      expect(viewModel.nodeViews['n1'].y).toBe(0)

      const additionalNodeViews: NodeView[] = [
        {
          id: 'n2',
          x: 100,
          y: 200,
          values: new Map(),
        },
      ]

      viewModel = addNodeViewsToModel(viewModel, additionalNodeViews)

      expect(viewModel.nodeViews['n1']).toBeDefined()
      expect(viewModel.nodeViews['n2']).toBeDefined()
      expect(Object.keys(viewModel.nodeViews)).toHaveLength(2)
    })
  })

  describe('getNetworkViewId', () => {
    it('should generate view ID for new view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetwork('test-network-1'),
      )
      networkView.type = 'nodeLink'

      const viewId = getNetworkViewId(networkView, [])

      expect(viewId).toBe('test-network-1-nodeLink-1')
    })

    it('should increment view ID when views exist', () => {
      const networkView = createViewModel(
        NetworkFn.createNetwork('test-network-1'),
      )
      networkView.type = 'nodeLink'
      const existingViews: NetworkView[] = [
        {
          ...createViewModel(NetworkFn.createNetwork('test-network-1')),
          viewId: 'test-network-1-nodeLink-1',
          type: 'nodeLink',
        },
        {
          ...createViewModel(NetworkFn.createNetwork('test-network-1')),
          viewId: 'test-network-1-nodeLink-2',
          type: 'nodeLink',
        },
      ]

      const viewId = getNetworkViewId(networkView, existingViews)

      expect(viewId).toBe('test-network-1-nodeLink-3')
    })

    it('should use default type if not provided', () => {
      const networkView = createViewModel(
        NetworkFn.createNetwork('test-network-1'),
      )
      delete networkView.type

      const viewId = getNetworkViewId(networkView, [])

      expect(viewId).toBe('test-network-1-nodeLink-1')
    })
  })

  describe('exclusiveSelect', () => {
    it('should set selected nodes and edges exclusively', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      networkView.selectedNodes = ['n1']
      networkView.selectedEdges = ['e1']

      const result = exclusiveSelect(networkView, ['n2'], [])

      expect(result.selectedNodes).toEqual(['n2'])
      expect(result.selectedEdges).toEqual([])
      expect(result).not.toBe(networkView) // Immutability check
      expect(networkView.selectedNodes).toEqual(['n1']) // Original unchanged
    })

    it('should clear selection when empty arrays provided', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [{ id: 'e1', s: 'n1', t: 'n1' }],
        ),
      )
      networkView.selectedNodes = ['n1']
      networkView.selectedEdges = ['e1']

      const result = exclusiveSelect(networkView, [], [])

      expect(result.selectedNodes).toEqual([])
      expect(result.selectedEdges).toEqual([])
    })
  })

  describe('toggleSelected', () => {
    it('should toggle node selection', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )
      networkView.selectedNodes = ['n1']

      const result = toggleSelected(networkView, ['n1', 'n2'])

      expect(result.selectedNodes).not.toContain('n1')
      expect(result.selectedNodes).toContain('n2')
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should toggle edge selection', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      networkView.selectedEdges = ['e1']

      const result = toggleSelected(networkView, ['e1'])

      expect(result.selectedEdges).not.toContain('e1')
    })

    it('should handle both nodes and edges', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [{ id: 'e1', s: 'n1', t: 'n1' }],
        ),
      )

      const result = toggleSelected(networkView, ['n1', 'e1'])

      expect(result.selectedNodes).toContain('n1')
      expect(result.selectedEdges).toContain('e1')
    })
  })

  describe('additiveSelect', () => {
    it('should add nodes to selection without removing existing', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )
      networkView.selectedNodes = ['n1']

      const result = additiveSelect(networkView, ['n2'])

      expect(result.selectedNodes).toContain('n1')
      expect(result.selectedNodes).toContain('n2')
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should add edges to selection without removing existing', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      networkView.selectedEdges = []

      const result = additiveSelect(networkView, ['e1'])

      expect(result.selectedEdges).toContain('e1')
    })
  })

  describe('additiveUnselect', () => {
    it('should remove nodes from selection without affecting others', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )
      networkView.selectedNodes = ['n1', 'n2']

      const result = additiveUnselect(networkView, ['n1'])

      expect(result.selectedNodes).not.toContain('n1')
      expect(result.selectedNodes).toContain('n2')
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should remove edges from selection without affecting others', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      networkView.selectedEdges = ['e1']

      const result = additiveUnselect(networkView, ['e1'])

      expect(result.selectedEdges).not.toContain('e1')
    })
  })

  describe('setNodePosition', () => {
    it('should set node position', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [],
        ),
      )

      const result = setNodePosition(networkView, 'n1', [100, 200])

      expect(result.nodeViews['n1'].x).toBe(100)
      expect(result.nodeViews['n1'].y).toBe(200)
      expect(result).not.toBe(networkView) // Immutability check
      expect(networkView.nodeViews['n1'].x).toBe(0) // Original unchanged
    })

    it('should set node position with z coordinate', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [],
        ),
      )

      const result = setNodePosition(networkView, 'n1', [100, 200, 300])

      expect(result.nodeViews['n1'].x).toBe(100)
      expect(result.nodeViews['n1'].y).toBe(200)
      expect(result.nodeViews['n1'].z).toBe(300)
    })

    it('should return unchanged if node does not exist', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists('test-network-1', [], []),
      )

      const result = setNodePosition(networkView, 'non-existent', [100, 200])

      expect(result).toBe(networkView) // Should return unchanged
    })
  })

  describe('updateNodePositions', () => {
    it('should update multiple node positions', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )
      const positions = new Map<IdType, [number, number, number?]>([
        ['n1', [100, 200]],
        ['n2', [300, 400]],
      ])

      const result = updateNodePositions(networkView, positions)

      expect(result.nodeViews['n1'].x).toBe(100)
      expect(result.nodeViews['n1'].y).toBe(200)
      expect(result.nodeViews['n2'].x).toBe(300)
      expect(result.nodeViews['n2'].y).toBe(400)
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should only update positions for nodes in the map', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )
      const originalN2X = networkView.nodeViews['n2'].x
      const positions = new Map<IdType, [number, number, number?]>([
        ['n1', [100, 200]],
      ])

      const result = updateNodePositions(networkView, positions)

      expect(result.nodeViews['n1'].x).toBe(100)
      expect(result.nodeViews['n2'].x).toBe(originalN2X)
    })
  })

  describe('deleteObjects', () => {
    it('should delete nodes from view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )

      const result = deleteObjects(networkView, ['n1'])

      expect(result.nodeViews['n1']).toBeUndefined()
      expect(result.nodeViews['n2']).toBeDefined()
      expect(result).not.toBe(networkView) // Immutability check
      expect(networkView.nodeViews['n1']).toBeDefined() // Original unchanged
    })

    it('should delete edges from view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )

      const result = deleteObjects(networkView, ['e1'])

      expect(result.edgeViews['e1']).toBeUndefined()
    })

    it('should delete both nodes and edges', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [{ id: 'e1', s: 'n1', t: 'n1' }],
        ),
      )

      const result = deleteObjects(networkView, ['n1', 'e1'])

      expect(result.nodeViews['n1']).toBeUndefined()
      expect(result.edgeViews['e1']).toBeUndefined()
    })
  })

  describe('addNodeViewDirect', () => {
    it('should add a node view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists('test-network-1', [], []),
      )
      const newNodeView: NodeView = {
        id: 'n1',
        x: 100,
        y: 200,
        values: new Map(),
      }

      const result = addNodeViewDirect(networkView, newNodeView)

      expect(result.nodeViews['n1']).toEqual(newNodeView)
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should replace existing node view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [],
        ),
      )
      const updatedNodeView: NodeView = {
        id: 'n1',
        x: 999,
        y: 888,
        values: new Map(),
      }

      const result = addNodeViewDirect(networkView, updatedNodeView)

      expect(result.nodeViews['n1'].x).toBe(999)
      expect(result.nodeViews['n1'].y).toBe(888)
    })
  })

  describe('addEdgeViewDirect', () => {
    it('should add an edge view', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists('test-network-1', [], []),
      )
      const newEdgeView: EdgeView = {
        id: 'e1',
        values: new Map(),
      }

      const result = addEdgeViewDirect(networkView, newEdgeView)

      expect(result.edgeViews['e1']).toEqual(newEdgeView)
      expect(result).not.toBe(networkView) // Immutability check
    })
  })

  describe('deleteNodeViews', () => {
    it('should delete node views', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )

      const result = deleteNodeViews(networkView, ['n1'])

      expect(result.nodeViews['n1']).toBeUndefined()
      expect(result.nodeViews['n2']).toBeDefined()
      expect(result).not.toBe(networkView) // Immutability check
    })

    it('should delete multiple node views', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [],
        ),
      )

      const result = deleteNodeViews(networkView, ['n1', 'n2'])

      expect(result.nodeViews['n1']).toBeUndefined()
      expect(result.nodeViews['n2']).toBeUndefined()
    })
  })

  describe('deleteEdgeViews', () => {
    it('should delete edge views', () => {
      const networkView = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }, { id: 'n2' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )

      const result = deleteEdgeViews(networkView, ['e1'])

      expect(result.edgeViews['e1']).toBeUndefined()
      expect(result).not.toBe(networkView) // Immutability check
    })
  })

  describe('immutability', () => {
    it('should not mutate the original network view in any operation', () => {
      const original = createViewModel(
        NetworkFn.createNetworkFromLists(
          'test-network-1',
          [{ id: 'n1' }],
          [{ id: 'e1', s: 'n1', t: 'n1' }],
        ),
      )
      const originalSelectedNodes = original.selectedNodes
      const originalNodeX = original.nodeViews['n1'].x

      // Perform various operations
      let networkView = exclusiveSelect(original, ['n1'], ['e1'])
      networkView = toggleSelected(networkView, ['n1'])
      networkView = setNodePosition(networkView, 'n1', [100, 200])
      networkView = addNodeViewDirect(networkView, {
        id: 'n2',
        x: 300,
        y: 400,
        values: new Map(),
      })
      networkView = deleteObjects(networkView, ['n2'])

      // Verify original is unchanged
      expect(original.selectedNodes).toBe(originalSelectedNodes)
      expect(original.nodeViews['n1'].x).toBe(originalNodeX)
      expect(original.nodeViews['n2']).toBeUndefined()
      expect(original.edgeViews['e1']).toBeDefined()
    })
  })

  describe('addNodeViewWithPosition', () => {
    it('should add a node view with 2D position', () => {
      const network = NetworkFn.createNetwork('test-network-100')
      const networkView = createViewModel(network)

      const updated = addNodeViewWithPosition(networkView, 'n1', [100, 200])

      expect(updated.nodeViews['n1']).toBeDefined()
      expect(updated.nodeViews['n1'].id).toBe('n1')
      expect(updated.nodeViews['n1'].x).toBe(100)
      expect(updated.nodeViews['n1'].y).toBe(200)
      expect(updated.nodeViews['n1'].z).toBeUndefined()
      expect(updated.nodeViews['n1'].values).toBeInstanceOf(Map)
    })

    it('should add a node view with 3D position', () => {
      const network = NetworkFn.createNetwork('test-network-101')
      const networkView = createViewModel(network)

      const updated = addNodeViewWithPosition(networkView, 'n1', [100, 200, 300])

      expect(updated.nodeViews['n1']).toBeDefined()
      expect(updated.nodeViews['n1'].x).toBe(100)
      expect(updated.nodeViews['n1'].y).toBe(200)
      expect(updated.nodeViews['n1'].z).toBe(300)
    })

    it('should add node view to network view with existing nodes', () => {
      const network = NetworkFn.createNetworkFromLists(
        'test-network-102',
        [{ id: 'n1' }],
        [],
      )
      const networkView = createViewModel(network)

      const updated = addNodeViewWithPosition(networkView, 'n2', [150, 250])

      expect(Object.keys(updated.nodeViews)).toHaveLength(2)
      expect(updated.nodeViews['n1']).toBeDefined()
      expect(updated.nodeViews['n2']).toBeDefined()
      expect(updated.nodeViews['n2'].x).toBe(150)
      expect(updated.nodeViews['n2'].y).toBe(250)
    })

    it('should not mutate original network view', () => {
      const network = NetworkFn.createNetwork('test-network-103')
      const networkView = createViewModel(network)
      const originalNodeViews = networkView.nodeViews

      const updated = addNodeViewWithPosition(networkView, 'n1', [100, 200])

      expect(networkView.nodeViews).toBe(originalNodeViews)
      expect(updated.nodeViews).not.toBe(originalNodeViews)
      expect(Object.keys(networkView.nodeViews)).toHaveLength(0)
      expect(Object.keys(updated.nodeViews)).toHaveLength(1)
    })

    it('should initialize values with empty Map', () => {
      const network = NetworkFn.createNetwork('test-network-104')
      const networkView = createViewModel(network)

      const updated = addNodeViewWithPosition(networkView, 'n1', [100, 200])

      expect(updated.nodeViews['n1'].values).toBeInstanceOf(Map)
      expect(updated.nodeViews['n1'].values.size).toBe(0)
    })
  })
})
