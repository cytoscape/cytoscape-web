import {
  createNewNetworkView,
  updateNetworkView,
} from './compute-view-util'
import { Network, Node, Edge } from '../../NetworkModel'
import NetworkFn from '../../NetworkModel'
import { Table, Column } from '../../TableModel'
import { createTable } from '../../TableModel/impl/InMemoryTable'
import { VisualStyle } from '../VisualStyle'
import { createVisualStyle } from './VisualStyleFnImpl'
import { NetworkView } from '../../ViewModel'
import { VisualPropertyName } from '../VisualPropertyName'

// to run these: npx jest src/models/VisualStyleModel/impl/compute-view-util.test.ts

describe('compute-view-util', () => {
  let network: Network
  let nodeTable: Table
  let edgeTable: Table
  let visualStyle: VisualStyle

  beforeEach(() => {
    // Create a simple network
    const nodes: Node[] = [
      { id: 'n1' },
      { id: 'n2' },
      { id: 'n3' },
    ]
    const edges: Edge[] = [
      { id: 'e1', s: 'n1', t: 'n2' },
      { id: 'e2', s: 'n2', t: 'n3' },
    ]
    network = NetworkFn.createNetworkFromLists('test-network', nodes, edges)

    // Create node table with columns and data
    const nodeColumns: Column[] = [
      { name: 'name', type: 'string' },
      { name: 'score', type: 'double' },
    ]
    const nodeRows = new Map([
      ['n1', { name: 'Node1', score: 10 }],
      ['n2', { name: 'Node2', score: 20 }],
      ['n3', { name: 'Node3', score: 30 }],
    ])
    nodeTable = createTable('node-table', nodeColumns, nodeRows)

    // Create edge table with columns and data
    const edgeColumns: Column[] = [
      { name: 'interaction', type: 'string' },
      { name: 'weight', type: 'double' },
    ]
    const edgeRows = new Map([
      ['e1', { interaction: 'interacts', weight: 0.5 }],
      ['e2', { interaction: 'interacts', weight: 0.7 }],
    ])
    edgeTable = createTable('edge-table', edgeColumns, edgeRows)

    // Create visual style
    visualStyle = createVisualStyle()
  })

  describe('createNewNetworkView', () => {
    it('should create a network view with correct structure', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(networkView).toBeDefined()
      expect(networkView.id).toBe(network.id)
      expect(networkView.values).toBeInstanceOf(Map)
      expect(networkView.nodeViews).toBeDefined()
      expect(networkView.edgeViews).toBeDefined()
      expect(networkView.selectedNodes).toEqual([])
      expect(networkView.selectedEdges).toEqual([])
    })

    it('should create node views for all nodes', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(Object.keys(networkView.nodeViews)).toHaveLength(3)
      expect(networkView.nodeViews['n1']).toBeDefined()
      expect(networkView.nodeViews['n2']).toBeDefined()
      expect(networkView.nodeViews['n3']).toBeDefined()
    })

    it('should create edge views for all edges', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(Object.keys(networkView.edgeViews)).toHaveLength(2)
      expect(networkView.edgeViews['e1']).toBeDefined()
      expect(networkView.edgeViews['e2']).toBeDefined()
    })

    it('should create node views with correct structure', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const nodeView = networkView.nodeViews['n1']
      expect(nodeView).toBeDefined()
      expect(nodeView.id).toBe('n1')
      expect(nodeView.values).toBeInstanceOf(Map)
      expect(typeof nodeView.x).toBe('number')
      expect(typeof nodeView.y).toBe('number')
    })

    it('should create edge views with correct structure', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const edgeView = networkView.edgeViews['e1']
      expect(edgeView).toBeDefined()
      expect(edgeView.id).toBe('e1')
      expect(edgeView.values).toBeInstanceOf(Map)
    })

    it('should set node positions to 0 when no existing views', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(networkView.nodeViews['n1'].x).toBe(0)
      expect(networkView.nodeViews['n1'].y).toBe(0)
      expect(networkView.nodeViews['n2'].x).toBe(0)
      expect(networkView.nodeViews['n2'].y).toBe(0)
    })

    it('should handle empty network', () => {
      const emptyNetwork = NetworkFn.createNetwork('empty-network')
      const emptyNodeTable = createTable('empty-node-table', [])
      const emptyEdgeTable = createTable('empty-edge-table', [])

      const networkView = createNewNetworkView(
        emptyNetwork,
        visualStyle,
        emptyNodeTable,
        emptyEdgeTable,
      )

      expect(networkView.id).toBe('empty-network')
      expect(Object.keys(networkView.nodeViews)).toHaveLength(0)
      expect(Object.keys(networkView.edgeViews)).toHaveLength(0)
    })

    it('should compute visual property values from node table data', () => {
      const networkView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const nodeView = networkView.nodeViews['n1']
      // nodeLabel has passthrough mapping to 'name' attribute
      expect(nodeView.values.size).toBeGreaterThan(0)
    })
  })

  describe('updateNetworkView', () => {
    it('should update network view while preserving positions', () => {
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      // Set some positions
      initialView.nodeViews['n1'].x = 100
      initialView.nodeViews['n1'].y = 200
      initialView.nodeViews['n2'].x = 300
      initialView.nodeViews['n2'].y = 400
      initialView.selectedNodes = ['n1']
      initialView.selectedEdges = ['e1']

      const updatedView = updateNetworkView(
        network,
        initialView,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(updatedView.id).toBe(network.id)
      expect(updatedView.nodeViews['n1'].x).toBe(100)
      expect(updatedView.nodeViews['n1'].y).toBe(200)
      expect(updatedView.nodeViews['n2'].x).toBe(300)
      expect(updatedView.nodeViews['n2'].y).toBe(400)
      expect(updatedView.selectedNodes).toEqual(['n1'])
      expect(updatedView.selectedEdges).toEqual(['e1'])
    })

    it('should preserve selected nodes and edges', () => {
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      initialView.selectedNodes = ['n1', 'n2']
      initialView.selectedEdges = ['e1']

      const updatedView = updateNetworkView(
        network,
        initialView,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(updatedView.selectedNodes).toEqual(['n1', 'n2'])
      expect(updatedView.selectedEdges).toEqual(['e1'])
    })

    it('should update all node views', () => {
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const updatedView = updateNetworkView(
        network,
        initialView,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(Object.keys(updatedView.nodeViews)).toHaveLength(3)
      expect(updatedView.nodeViews['n1']).toBeDefined()
      expect(updatedView.nodeViews['n2']).toBeDefined()
      expect(updatedView.nodeViews['n3']).toBeDefined()
    })

    it('should update all edge views', () => {
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const updatedView = updateNetworkView(
        network,
        initialView,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      expect(Object.keys(updatedView.edgeViews)).toHaveLength(2)
      expect(updatedView.edgeViews['e1']).toBeDefined()
      expect(updatedView.edgeViews['e2']).toBeDefined()
    })

    it('should handle network with changed number of nodes', () => {
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      // Add a new node to the network
      const nodes: Node[] = [
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3' },
        { id: 'n4' },
      ]
      const updatedNetwork = NetworkFn.createNetworkFromLists(
        'test-network',
        nodes,
        network.edges,
      )

      const updatedNodeRows = new Map([
        ['n1', { name: 'Node1', score: 10 }],
        ['n2', { name: 'Node2', score: 20 }],
        ['n3', { name: 'Node3', score: 30 }],
        ['n4', { name: 'Node4', score: 40 }],
      ])
      const updatedNodeTable = createTable(
        'node-table',
        nodeTable.columns,
        updatedNodeRows,
      )

      const updatedView = updateNetworkView(
        updatedNetwork,
        initialView,
        visualStyle,
        updatedNodeTable,
        edgeTable,
      )

      // Should still have views for all nodes
      expect(Object.keys(updatedView.nodeViews)).toHaveLength(4)
    })

    it('should handle empty network', () => {
      const emptyNetwork = NetworkFn.createNetwork('empty-network')
      const emptyNodeTable = createTable('empty-node-table', [])
      const emptyEdgeTable = createTable('empty-edge-table', [])
      const initialView = createNewNetworkView(
        network,
        visualStyle,
        nodeTable,
        edgeTable,
      )

      const updatedView = updateNetworkView(
        emptyNetwork,
        initialView,
        visualStyle,
        emptyNodeTable,
        emptyEdgeTable,
      )

      expect(updatedView.id).toBe('empty-network')
      expect(Object.keys(updatedView.nodeViews)).toHaveLength(0)
      expect(Object.keys(updatedView.edgeViews)).toHaveLength(0)
    })
  })
})

