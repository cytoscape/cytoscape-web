/**
 * Tests for ViewModel implementation
 *
 * These tests verify the behavior of view model creation and manipulation functions.
 */
import { Network, Node, Edge } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import {
  createViewModel,
  addNodeViewsToModel,
  addEdgeViewsToModel,
  addNodeViewToModel,
  addEdgeViewToModel,
} from './ViewModelImpl'
import { createViewModelFromCX } from '../../CxModel/impl/converters'
import { NetworkView, NodeView, EdgeView } from '../index'
import { Cx2 } from '../../CxModel/Cx2'
import { Node as CxNode } from '../../CxModel/Cx2/CoreAspects/Node'
import { Edge as CxEdge } from '../../CxModel/Cx2/CoreAspects/Edge'
import { IdType } from '../../IdType'

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
})
