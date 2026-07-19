import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/elementApi.test.ts
// Plain Jest tests for elementApi core — no renderHook, no React context.
import {
  createEdgesCore,
  createNodesCore,
  deleteEdgesCore,
  deleteNodesCore,
} from '../../models/CyNetworkModel'
import { AppCodes, ElementCodes, StyleCodes } from '../types/ApiResult'
import { elementApi } from './elementApi'

// ── Mock stores ──────────────────────────────────────────────────────────────

const mockNetworks = new Map()
const mockNetworkActions = {
  deleteNodes: vi.fn().mockReturnValue([]),
  addNode: vi.fn(),
  addEdge: vi.fn(),
  addEdges: vi.fn(),
  deleteEdges: vi.fn(),
  moveEdge: vi.fn(),
}

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({
      ...mockNetworkActions,
      networks: mockNetworks,
    })),
  },
}))

const mockTables: Record<string, any> = {}
const mockTableActions = {
  deleteRows: vi.fn(),
  editRows: vi.fn(),
  setValue: vi.fn(),
  setValues: vi.fn(),
}

vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: vi.fn(() => ({
      ...mockTableActions,
      tables: mockTables,
    })),
  },
}))

const mockViewModels: Record<string, any> = {}
const mockViewModelActions = {
  deleteObjects: vi.fn(),
  addNodeView: vi.fn(),
  addEdgeView: vi.fn(),
  exclusiveSelect: vi.fn(),
  getViewModel: vi.fn(),
}

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: vi.fn(() => ({
      ...mockViewModelActions,
      viewModels: mockViewModels,
    })),
  },
}))

const mockVisualStyles: Record<string, any> = {}
const mockVisualStyleActions = {
  deleteBypass: vi.fn(),
  setBypass: vi.fn(),
}

vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(() => ({
      ...mockVisualStyleActions,
      visualStyles: mockVisualStyles,
    })),
  },
}))

const mockSummaryActions = { update: vi.fn() }

vi.mock('../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: vi.fn(() => mockSummaryActions),
  },
}))

const mockUndoStacks: Record<string, any> = {}
const mockUndoActions = {
  setUndoStack: vi.fn(),
  setRedoStack: vi.fn(),
}

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      ...mockUndoActions,
      undoRedoStacks: mockUndoStacks,
    })),
  },
}))

vi.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: vi.fn(() => ({
      ui: { activeNetworkView: '' },
    })),
  },
}))

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { currentNetworkId: 'net1' },
    })),
  },
}))

// ── Mock cytoscape.js internal store ──────────────────────────────────────────

const mockCyNodes: any[] = []
const mockCyEdges: any[] = []

function makeCyCollection(items: any[]) {
  const col: any = items.slice()
  col.map = (fn: any) => items.map(fn)
  col.nodes = () => makeCyCollection(items.filter((i: any) => i._isNode))
  col.edges = () => makeCyCollection(items.filter((i: any) => !i._isNode))
  col.roots = () =>
    makeCyCollection(
      items.filter(
        (n: any) =>
          n._isNode &&
          !mockCyEdges.some((e: any) => e.target().id() === n.id()),
      ),
    )
  col.leaves = () =>
    makeCyCollection(
      items.filter(
        (n: any) =>
          n._isNode &&
          !mockCyEdges.some((e: any) => e.source().id() === n.id()),
      ),
    )
  return col
}

function makeCyNode(id: string) {
  const node: any = {
    _isNode: true,
    id: () => id,
    empty: () => false,
    connectedEdges: () =>
      makeCyCollection(
        mockCyEdges.filter(
          (e: any) => e.source().id() === id || e.target().id() === id,
        ),
      ),
    neighborhood: () => {
      const neighborEdges = mockCyEdges.filter(
        (e: any) => e.source().id() === id || e.target().id() === id,
      )
      const neighborNodeIds = new Set<string>()
      neighborEdges.forEach((e: any) => {
        if (e.source().id() !== id) neighborNodeIds.add(e.source().id())
        if (e.target().id() !== id) neighborNodeIds.add(e.target().id())
      })
      return makeCyCollection(
        mockCyNodes.filter((n: any) => neighborNodeIds.has(n.id())),
      )
    },
    outgoers: () => {
      const outEdges = mockCyEdges.filter(
        (e: any) => e.source().id() === id,
      )
      const outNodeIds = new Set(outEdges.map((e: any) => e.target().id()))
      return makeCyCollection([
        ...outEdges,
        ...mockCyNodes.filter((n: any) => outNodeIds.has(n.id())),
      ])
    },
    incomers: () => {
      const inEdges = mockCyEdges.filter(
        (e: any) => e.target().id() === id,
      )
      const inNodeIds = new Set(inEdges.map((e: any) => e.source().id()))
      return makeCyCollection([
        ...inEdges,
        ...mockCyNodes.filter((n: any) => inNodeIds.has(n.id())),
      ])
    },
    successors: () => {
      const visited = new Set<string>()
      const queue = [id]
      const resultNodes: any[] = []
      while (queue.length > 0) {
        const curr = queue.shift()!
        mockCyEdges.forEach((e: any) => {
          if (e.source().id() === curr && !visited.has(e.target().id())) {
            visited.add(e.target().id())
            queue.push(e.target().id())
            resultNodes.push(
              mockCyNodes.find((n: any) => n.id() === e.target().id()),
            )
          }
        })
      }
      return makeCyCollection(resultNodes)
    },
    predecessors: () => {
      const visited = new Set<string>()
      const queue = [id]
      const resultNodes: any[] = []
      while (queue.length > 0) {
        const curr = queue.shift()!
        mockCyEdges.forEach((e: any) => {
          if (e.target().id() === curr && !visited.has(e.source().id())) {
            visited.add(e.source().id())
            queue.push(e.source().id())
            resultNodes.push(
              mockCyNodes.find((n: any) => n.id() === e.source().id()),
            )
          }
        })
      }
      return makeCyCollection(resultNodes)
    },
  }
  return node
}

function makeCyEdge(id: string, sourceId: string, targetId: string) {
  return {
    _isNode: false,
    id: () => id,
    source: () => ({ id: () => sourceId }),
    target: () => ({ id: () => targetId }),
  }
}

const mockCyInstance = {
  $id: (id: string) => {
    const found = mockCyNodes.find((n: any) => n.id() === id)
    return found ?? { empty: () => true }
  },
  nodes: () => makeCyCollection(mockCyNodes),
  edges: () => makeCyCollection(mockCyEdges),
}

vi.mock('../../models/NetworkModel/impl/networkImpl', () => ({
  getInternalNetworkDataStore: vi.fn(() => mockCyInstance),
}))

// ── Mock pure functions ───────────────────────────────────────────────────────

vi.mock('../../models/CyNetworkModel', () => ({
  createNodesCore: vi.fn(),
  createEdgesCore: vi.fn(),
  deleteNodesCore: vi.fn().mockReturnValue({
    deletedNodeIds: [],
    deletedEdges: [],
    deletedNodeViews: [],
    deletedEdgeViews: [],
    deletedNodeRows: new Map(),
    deletedEdgeRows: new Map(),
  }),
  deleteEdgesCore: vi.fn().mockReturnValue({
    deletedEdgeIds: [],
    deletedEdgeViews: [],
    deletedEdgeRows: new Map(),
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNetwork(id: string, nodes: any[] = [], edges: any[] = []) {
  return { id, nodes, edges }
}

function resetMocks() {
  mockNetworks.clear()
  Object.keys(mockTables).forEach((k) => delete mockTables[k])
  Object.keys(mockVisualStyles).forEach((k) => delete mockVisualStyles[k])
  Object.keys(mockViewModels).forEach((k) => delete mockViewModels[k])
  Object.keys(mockUndoStacks).forEach((k) => delete mockUndoStacks[k])
  mockCyNodes.length = 0
  mockCyEdges.length = 0
  vi.clearAllMocks()
}

/** Visual style with one node- and one edge-scoped property, for bypass tests */
function setMockStyle(networkId: string) {
  mockVisualStyles[networkId] = {
    NODE_FILL_COLOR: { group: 'node', type: 'color', defaultValue: '#ffffff' },
    NODE_LABEL: { group: 'node', type: 'string', defaultValue: '' },
    EDGE_LINE_COLOR: { group: 'edge', type: 'color', defaultValue: '#000000' },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('elementApi', () => {
  beforeEach(() => {
    resetMocks()
  })

  // ── generateNextNodeId ────────────────────────────────────────────────────

  describe('generateNextNodeId', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.generateNextNodeId('missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns "0" when network has no nodes', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.generateNextNodeId('net1')
      expect(result.success && result.data.nodeId).toBe('0')
    })

    it('returns max+1 when nodes exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: '3' }, { id: '7' }]))
      const result = elementApi.generateNextNodeId('net1')
      expect(result.success && result.data.nodeId).toBe('8')
    })
  })

  // ── generateNextEdgeId ────────────────────────────────────────────────────

  describe('generateNextEdgeId', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.generateNextEdgeId('missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns "e0" when network has no edges', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.generateNextEdgeId('net1')
      expect(result.success && result.data.edgeId).toBe('e0')
    })

    it('returns e(max+1) when edges exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], [{ id: 'e2' }, { id: 'e5' }]))
      const result = elementApi.generateNextEdgeId('net1')
      expect(result.success && result.data.edgeId).toBe('e6')
    })
  })

  // ── getNode ───────────────────────────────────────────────────────────────

  describe('getNode', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.getNode('missing', 'n1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns NodeNotFound when node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }]))
      const result = elementApi.getNode('net1', 'n1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns ok with attributes and position when node exists', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }]))
      mockTables['net1'] = {
        nodeTable: {
          rows: new Map([['n1', { name: 'TestNode' }]]),
          columns: [],
        },
        edgeTable: { rows: new Map(), columns: [] },
      }
      mockViewModelActions.getViewModel.mockReturnValue({
        nodeViews: { n1: { id: 'n1', x: 10, y: 20 } },
      })

      const result = elementApi.getNode('net1', 'n1')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.attributes).toEqual({ name: 'TestNode' })
        expect(result.data.position).toEqual([10, 20])
      }
    })

    it('includes z in position when present', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }]))
      mockTables['net1'] = {
        nodeTable: { rows: new Map([['n1', {}]]), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      mockViewModelActions.getViewModel.mockReturnValue({
        nodeViews: { n1: { id: 'n1', x: 1, y: 2, z: 3 } },
      })

      const result = elementApi.getNode('net1', 'n1')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.position).toEqual([1, 2, 3])
      }
    })
  })

  // ── getNodes ──────────────────────────────────────────────────────────────

  describe('getNodes', () => {
    const setupNodes = (): void => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }]))
      mockTables['net1'] = {
        nodeTable: {
          rows: new Map([
            ['n1', { name: 'Alice' }],
            ['n2', { name: 'Bob' }],
          ]),
          columns: [],
        },
        edgeTable: { rows: new Map(), columns: [] },
      }
      mockViewModelActions.getViewModel.mockReturnValue({
        nodeViews: {
          n1: { id: 'n1', x: 1, y: 2 },
          n2: { id: 'n2', x: 3, y: 4 },
        },
      })
    }

    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.getNodes('missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns every node with id, attributes, and position when ids omitted', () => {
      setupNodes()
      const result = elementApi.getNodes('net1')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.missing).toEqual([])
        expect(result.data.nodes).toEqual([
          { id: 'n1', attributes: { name: 'Alice' }, position: [1, 2] },
          { id: 'n2', attributes: { name: 'Bob' }, position: [3, 4] },
        ])
      }
    })

    it('returns only requested ids and reports missing ones', () => {
      setupNodes()
      const result = elementApi.getNodes('net1', ['n2', 'ghost'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodes.map((n) => n.id)).toEqual(['n2'])
        expect(result.data.missing).toEqual(['ghost'])
      }
    })
  })

  // ── getEdge ───────────────────────────────────────────────────────────────

  describe('getEdge', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.getEdge('missing', 'e1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns EdgeNotFound when edge does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], [{ id: 'e2', s: 'n1', t: 'n2' }]))
      const result = elementApi.getEdge('net1', 'e1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.EDGE_NOT_FOUND.code)
      }
    })

    it('returns ok with edge data when edge exists', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], [{ id: 'e1', s: 'n1', t: 'n2' }]))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: {
          rows: new Map([['e1', { interaction: 'activates' }]]),
          columns: [],
        },
      }

      const result = elementApi.getEdge('net1', 'e1')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sourceId).toBe('n1')
        expect(result.data.targetId).toBe('n2')
        expect(result.data.attributes).toEqual({ interaction: 'activates' })
      }
    })
  })

  // ── createNode ────────────────────────────────────────────────────────────

  describe('createNode', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.createNode('missing', [0, 0])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns ok with nodeId and node data on success', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createNode('net1', [100, 200])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodeId).toBe('0')
        expect(result.data.node).toEqual({
          attributes: {},
          position: [100, 200],
        })
      }
    })

    it('rejects an "id" key in the attributes payload (CX2 N3)', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createNode('net1', [0, 0], {
        attributes: { id: '99', name: 'shadow' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_ID_FORBIDDEN.code)
      }
    })

    it('calls exclusiveSelect when autoSelect is true (default)', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net1', [0, 0])
      expect(mockViewModelActions.exclusiveSelect).toHaveBeenCalledWith(
        'net1',
        ['0'],
        [],
      )
    })

    it('does not call exclusiveSelect when autoSelect is false', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net1', [0, 0], { autoSelect: false })
      expect(mockViewModelActions.exclusiveSelect).not.toHaveBeenCalled()
    })

    it('records undo via postEdit', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net1', [0, 0])
      expect(mockUndoActions.setUndoStack).toHaveBeenCalled()
    })

    it('records undo on the stack of the mutated network, not the current one', () => {
      // WorkspaceStore mock reports currentNetworkId 'net1'; mutate 'net2'.
      // Regression: the undo entry must land on net2's stack, otherwise a
      // later undo on net1 would replay net2's inverse operation.
      mockNetworks.set('net2', makeNetwork('net2', [], []))
      mockTables['net2'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net2', [0, 0])
      expect(mockUndoActions.setUndoStack).toHaveBeenCalledWith(
        'net2',
        expect.any(Array),
      )
      expect(mockUndoActions.setRedoStack).toHaveBeenCalledWith('net2', [])
    })

    it('never passes skipUndo: true to internal stores', () => {
      // createNodesCore is called without any skipUndo parameter
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net1', [0, 0])
      // createNodesCore does not take a skipUndo param — just verify it was called
      expect(createNodesCore).toHaveBeenCalled()
    })

    it('applies bypass props when bypass option is provided', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      elementApi.createNode('net1', [0, 0], {
        bypass: { NODE_FILL_COLOR: '#ff0000' } as any,
      })

      expect(mockVisualStyleActions.setBypass).toHaveBeenCalledWith(
        'net1',
        'NODE_FILL_COLOR',
        ['0'],
        '#ff0000',
      )
    })

    it('rejects a bypass for an unknown visual property without creating the node', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      const result = elementApi.createNode('net1', [0, 0], {
        bypass: { NOT_A_REAL_VP: '#ff0000' } as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
      }
      expect(createNodesCore).not.toHaveBeenCalled()
      expect(mockVisualStyleActions.setBypass).not.toHaveBeenCalled()
    })

    it('rejects an edge-scoped bypass on node creation (CX2 BV2)', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      const result = elementApi.createNode('net1', [0, 0], {
        bypass: { EDGE_LINE_COLOR: '#00ff00' } as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(StyleCodes.BYPASS_SCOPE_MISMATCH.code)
      }
      expect(createNodesCore).not.toHaveBeenCalled()
    })

    it('rejects a bypass value that fails type validation without creating the node', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      const result = elementApi.createNode('net1', [0, 0], {
        bypass: { NODE_FILL_COLOR: 'not-a-color' } as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(StyleCodes.INVALID_COLOR.code)
      }
      expect(createNodesCore).not.toHaveBeenCalled()
    })

    it('does not call setBypass when no bypass option', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNode('net1', [0, 0])
      expect(mockVisualStyleActions.setBypass).not.toHaveBeenCalled()
    })

    it('applies multiple bypass props when multiple entries provided', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      elementApi.createNode('net1', [0, 0], {
        bypass: {
          NODE_FILL_COLOR: '#ff0000',
          NODE_LABEL: 'custom-label',
        } as any,
      })

      expect(mockVisualStyleActions.setBypass).toHaveBeenCalledTimes(2)
    })
  })

  // ── createEdge ────────────────────────────────────────────────────────────

  describe('createEdge', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.createEdge('missing', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns NodeNotFound when source node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }], []))
      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns NodeNotFound when target node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }], []))
      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns ok with edgeId and edge data on success', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.edgeId).toBe('e0')
        expect(result.data.edge).toEqual({
          sourceId: 'n1',
          targetId: 'n2',
          attributes: {},
        })
      }
    })

    it('rejects an "id" key in the attributes payload (CX2 E6)', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createEdge('net1', 'n1', 'n2', {
        attributes: { id: 'e99' },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.EDGE_ID_FORBIDDEN.code)
      }
    })

    it('applies bypass props when bypass option is provided', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      elementApi.createEdge('net1', 'n1', 'n2', {
        bypass: { EDGE_LINE_COLOR: '#00ff00' } as any,
      })

      expect(mockVisualStyleActions.setBypass).toHaveBeenCalledWith(
        'net1',
        'EDGE_LINE_COLOR',
        ['e0'],
        '#00ff00',
      )
    })

    it('rejects a node-scoped bypass on edge creation (CX2 BV2)', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      const result = elementApi.createEdge('net1', 'n1', 'n2', {
        bypass: { NODE_FILL_COLOR: '#ff0000' } as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(StyleCodes.BYPASS_SCOPE_MISMATCH.code)
      }
      expect(createEdgesCore).not.toHaveBeenCalled()
      expect(mockVisualStyleActions.setBypass).not.toHaveBeenCalled()
    })

    it('does not call setBypass when no bypass option', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createEdge('net1', 'n1', 'n2')
      expect(mockVisualStyleActions.setBypass).not.toHaveBeenCalled()
    })
  })

  // ── createNodes (batch) ─────────────────────────────────────────────────────

  describe('createNodes', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.createNodes('missing', [{ position: [0, 0] }])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('creates several nodes with sequential ids and distinct positions', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: '4' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createNodes('net1', [
        { position: [10, 20] },
        { position: [30, 40] },
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodes.map((n) => n.nodeId)).toEqual(['5', '6'])
        expect(result.data.nodes[0].node.position).toEqual([10, 20])
        expect(result.data.nodes[1].node.position).toEqual([30, 40])
      }
    })

    it('records a single batch undo entry covering all created nodes', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNodes('net1', [
        { position: [0, 0] },
        { position: [1, 1] },
        { position: [2, 2] },
      ])

      expect(mockUndoActions.setUndoStack).toHaveBeenCalledTimes(1)
      const stack = mockUndoActions.setUndoStack.mock.calls[0][1]
      expect(stack[0].undoCommand).toBe('CREATE_NODES_BATCH')
      expect(stack[0].undoParams).toEqual(['net1', ['0', '1', '2']])
    })

    it('creates nothing when any spec has an invalid bypass', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }
      setMockStyle('net1')

      const result = elementApi.createNodes('net1', [
        { position: [0, 0] },
        { position: [1, 1], bypass: { EDGE_LINE_COLOR: '#fff' } as any },
      ])

      expect(result.success).toBe(false)
      expect(createNodesCore).not.toHaveBeenCalled()
      expect(mockUndoActions.setUndoStack).not.toHaveBeenCalled()
    })

    it('selects all created nodes by default', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      elementApi.createNodes('net1', [{ position: [0, 0] }, { position: [1, 1] }])

      expect(mockViewModelActions.exclusiveSelect).toHaveBeenCalledWith(
        'net1',
        ['0', '1'],
        [],
      )
    })
  })

  // ── createEdges (batch) ─────────────────────────────────────────────────────

  describe('createEdges', () => {
    it('creates several edges with a single batch undo entry', () => {
      mockNetworks.set(
        'net1',
        makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }], []),
      )
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createEdges('net1', [
        { sourceNodeId: 'n1', targetNodeId: 'n2' },
        { sourceNodeId: 'n2', targetNodeId: 'n3' },
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.edges.map((e) => e.edgeId)).toEqual(['e0', 'e1'])
      }
      expect(mockUndoActions.setUndoStack).toHaveBeenCalledTimes(1)
      const stack = mockUndoActions.setUndoStack.mock.calls[0][1]
      expect(stack[0].undoCommand).toBe('CREATE_EDGES_BATCH')
    })

    it('creates nothing when any endpoint is missing', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createEdges('net1', [
        { sourceNodeId: 'n1', targetNodeId: 'ghost' },
      ])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
      expect(createEdgesCore).not.toHaveBeenCalled()
      expect(mockUndoActions.setUndoStack).not.toHaveBeenCalled()
    })
  })

  // ── moveEdge ──────────────────────────────────────────────────────────────

  describe('moveEdge', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.moveEdge('missing', 'e1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns EdgeNotFound when edge does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      const result = elementApi.moveEdge('net1', 'e1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.EDGE_NOT_FOUND.code)
      }
    })

    it('returns NodeNotFound when new source does not exist', () => {
      mockNetworks.set(
        'net1',
        makeNetwork('net1', [{ id: 'n2' }], [{ id: 'e1', s: 'n1', t: 'n2' }]),
      )
      const result = elementApi.moveEdge('net1', 'e1', 'missing', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns NodeNotFound when new target does not exist', () => {
      mockNetworks.set(
        'net1',
        makeNetwork('net1', [{ id: 'n1' }], [{ id: 'e1', s: 'n1', t: 'n2' }]),
      )
      const result = elementApi.moveEdge('net1', 'e1', 'n1', 'missing')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns ok() and calls NetworkStore.moveEdge on success', () => {
      mockNetworks.set(
        'net1',
        makeNetwork(
          'net1',
          [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      mockNetworkActions.moveEdge.mockReturnValue({
        oldSourceId: 'n1',
        oldTargetId: 'n2',
      })

      const result = elementApi.moveEdge('net1', 'e1', 'n1', 'n3')
      expect(result.success).toBe(true)
      expect(mockNetworkActions.moveEdge).toHaveBeenCalledWith(
        'net1',
        'e1',
        'n1',
        'n3',
      )
    })

    it('does not write source/target into the edge row (derived from topology)', () => {
      mockNetworks.set(
        'net1',
        makeNetwork(
          'net1',
          [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map([['e1', {}]]), columns: [] },
      }
      mockNetworkActions.moveEdge.mockReturnValue({
        oldSourceId: 'n1',
        oldTargetId: 'n2',
      })

      elementApi.moveEdge('net1', 'e1', 'n1', 'n3')

      // No row write — source/target come from the network model, and an
      // unreverted row write would go stale after undo
      expect(mockTableActions.editRows).not.toHaveBeenCalled()
    })

    it('records undo with correct params', () => {
      mockNetworks.set(
        'net1',
        makeNetwork(
          'net1',
          [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
          [{ id: 'e1', s: 'n1', t: 'n2' }],
        ),
      )
      mockNetworkActions.moveEdge.mockReturnValue({
        oldSourceId: 'n1',
        oldTargetId: 'n2',
      })

      elementApi.moveEdge('net1', 'e1', 'n1', 'n3')
      expect(mockUndoActions.setUndoStack).toHaveBeenCalled()
      const [[, undoStack]] = mockUndoActions.setUndoStack.mock.calls
      const edit = undoStack[undoStack.length - 1]
      expect(edit.undoParams).toEqual(['net1', 'e1', 'n1', 'n2'])
      expect(edit.redoParams).toEqual(['net1', 'e1', 'n1', 'n3'])
    })
  })

  // ── deleteNodes ───────────────────────────────────────────────────────────

  describe('deleteNodes', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.deleteNodes('missing', ['n1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns InvalidInput when nodeIds is empty', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.deleteNodes('net1', [])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
      }
    })

    it('returns NodeNotFound when none of the nodes exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }], []))
      const result = elementApi.deleteNodes('net1', ['n1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      }
    })

    it('returns ok with deletion counts and element data on success', () => {
      vi.mocked(deleteNodesCore).mockReturnValue({
        deletedNodeIds: ['n1'],
        deletedEdges: [{ id: 'e1', s: 'n1', t: 'n2' }],
        deletedNodeViews: [{ id: 'n1', x: 10, y: 20, values: new Map() }],
        deletedEdgeViews: [],
        deletedNodeRows: new Map([['n1', { name: 'Node1' }]]),
        deletedEdgeRows: new Map([['e1', { interaction: 'activates' }]]),
      })

      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }], []))

      const result = elementApi.deleteNodes('net1', ['n1'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deletedNodeCount).toBe(1)
        expect(result.data.deletedEdgeCount).toBe(1)
        expect(result.data.deletedNodes).toEqual([
          {
            id: 'n1',
            attributes: { name: 'Node1' },
            position: [10, 20],
          },
        ])
        expect(result.data.deletedEdges).toEqual([
          {
            id: 'e1',
            sourceId: 'n1',
            targetId: 'n2',
            attributes: { interaction: 'activates' },
          },
        ])
      }
    })
  })

  // ── deleteEdges ───────────────────────────────────────────────────────────

  describe('deleteEdges', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.deleteEdges('missing', ['e1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
      }
    })

    it('returns InvalidInput when edgeIds is empty', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.deleteEdges('net1', [])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
      }
    })

    it('returns EdgeNotFound when none of the edges exist', () => {
      mockNetworks.set(
        'net1',
        makeNetwork('net1', [], [{ id: 'e2', s: 'n1', t: 'n2' }]),
      )
      const result = elementApi.deleteEdges('net1', ['e1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ElementCodes.EDGE_NOT_FOUND.code)
      }
    })

    it('returns ok with deletion count and edge data on success', () => {
      vi.mocked(deleteEdgesCore).mockReturnValue({
        deletedEdgeIds: ['e1'],
        deletedEdgeViews: [],
        deletedEdgeRows: new Map([['e1', { weight: 0.5 }]]),
      })

      mockNetworks.set(
        'net1',
        makeNetwork('net1', [], [{ id: 'e1', s: 'n1', t: 'n2' }]),
      )

      const result = elementApi.deleteEdges('net1', ['e1'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deletedEdgeCount).toBe(1)
        expect(result.data.deletedEdges).toEqual([
          {
            id: 'e1',
            sourceId: 'n1',
            targetId: 'n2',
            attributes: { weight: 0.5 },
          },
        ])
      }
    })
  })

  // ── Graph Traversal ──────────────────────────────────────────────────────

  describe('graph traversal', () => {
    // Graph: A → B → C, A → D (directed)
    beforeEach(() => {
      resetMocks()
      const nodes = [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
        { id: 'D' },
      ]
      const edges = [
        { id: 'e1', s: 'A', t: 'B' },
        { id: 'e2', s: 'B', t: 'C' },
        { id: 'e3', s: 'A', t: 'D' },
      ]
      mockNetworks.set('net1', makeNetwork('net1', nodes, edges))
      // Set up cytoscape.js mock graph
      mockCyNodes.push(
        makeCyNode('A'),
        makeCyNode('B'),
        makeCyNode('C'),
        makeCyNode('D'),
      )
      mockCyEdges.push(
        makeCyEdge('e1', 'A', 'B'),
        makeCyEdge('e2', 'B', 'C'),
        makeCyEdge('e3', 'A', 'D'),
      )
    })

    describe('getNodeIds', () => {
      it('returns all node IDs', () => {
        const result = elementApi.getNodeIds('net1')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual(['A', 'B', 'C', 'D'])
        }
      })

      it('returns NetworkNotFound for invalid network', () => {
        const result = elementApi.getNodeIds('invalid')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
        }
      })
    })

    describe('getEdgeIds', () => {
      it('returns all edge IDs', () => {
        const result = elementApi.getEdgeIds('net1')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.edgeIds).toEqual(['e1', 'e2', 'e3'])
        }
      })

      it('returns NetworkNotFound for invalid network', () => {
        const result = elementApi.getEdgeIds('invalid')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
        }
      })
    })

    describe('getEdges', () => {
      it('returns all edges with source, target, and attributes in one call', () => {
        mockTables['net1'] = {
          nodeTable: { rows: new Map(), columns: [] },
          edgeTable: {
            rows: new Map([['e1', { interaction: 'pp' }]]),
            columns: [],
          },
        }
        const result = elementApi.getEdges('net1')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.missing).toEqual([])
          expect(result.data.edges).toEqual([
            { id: 'e1', sourceId: 'A', targetId: 'B', attributes: { interaction: 'pp' } },
            { id: 'e2', sourceId: 'B', targetId: 'C', attributes: {} },
            { id: 'e3', sourceId: 'A', targetId: 'D', attributes: {} },
          ])
        }
      })

      it('returns only requested edges and reports missing ones', () => {
        const result = elementApi.getEdges('net1', ['e2', 'ghost'])
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.edges.map((e) => e.id)).toEqual(['e2'])
          expect(result.data.missing).toEqual(['ghost'])
        }
      })

      it('returns an empty array for a network with no edges', () => {
        mockNetworks.set('empty', makeNetwork('empty', [{ id: 'X' }], []))
        const result = elementApi.getEdges('empty')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.edges).toEqual([])
        }
      })

      it('returns NetworkNotFound for invalid network', () => {
        const result = elementApi.getEdges('invalid')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
        }
      })
    })

    describe('getConnectedEdges', () => {
      it('returns edges connected to node A', () => {
        const result = elementApi.getConnectedEdges('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.edges).toHaveLength(2)
          const edgeSourceTargets = result.data.edges.map((e) => [
            e.sourceId,
            e.targetId,
          ])
          expect(edgeSourceTargets).toContainEqual(['A', 'B'])
          expect(edgeSourceTargets).toContainEqual(['A', 'D'])
        }
      })

      it('includes the edge id so results can be selected or deleted', () => {
        const result = elementApi.getConnectedEdges('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          const ids = result.data.edges.map((e) => e.id).sort()
          expect(ids).toEqual(['e1', 'e3'])
        }
      })

      it('returns NodeNotFound for invalid node', () => {
        const result = elementApi.getConnectedEdges('net1', 'Z')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
        }
      })
    })

    describe('getConnectedNodes', () => {
      it('returns neighbors of node A', () => {
        const result = elementApi.getConnectedNodes('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds.sort()).toEqual(['B', 'D'])
        }
      })
    })

    describe('getOutgoers', () => {
      it('returns outgoing nodes and edges from A', () => {
        const result = elementApi.getOutgoers('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds.sort()).toEqual(['B', 'D'])
          expect(result.data.edgeIds.sort()).toEqual(['e1', 'e3'])
        }
      })

      it('returns empty for leaf node C', () => {
        const result = elementApi.getOutgoers('net1', 'C')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual([])
          expect(result.data.edgeIds).toEqual([])
        }
      })
    })

    describe('getIncomers', () => {
      it('returns incoming nodes and edges to B', () => {
        const result = elementApi.getIncomers('net1', 'B')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual(['A'])
          expect(result.data.edgeIds).toEqual(['e1'])
        }
      })

      it('returns empty for root node A', () => {
        const result = elementApi.getIncomers('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual([])
          expect(result.data.edgeIds).toEqual([])
        }
      })
    })

    describe('getSuccessors', () => {
      it('returns all transitive downstream nodes from A', () => {
        const result = elementApi.getSuccessors('net1', 'A')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds.sort()).toEqual(['B', 'C', 'D'])
        }
      })

      it('returns only C from B', () => {
        const result = elementApi.getSuccessors('net1', 'B')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual(['C'])
        }
      })
    })

    describe('getPredecessors', () => {
      it('returns all transitive upstream nodes from C', () => {
        const result = elementApi.getPredecessors('net1', 'C')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds.sort()).toEqual(['A', 'B'])
        }
      })
    })

    describe('getRoots', () => {
      it('returns nodes with no incoming edges', () => {
        const result = elementApi.getRoots('net1')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds).toEqual(['A'])
        }
      })
    })

    describe('getLeaves', () => {
      it('returns nodes with no outgoing edges', () => {
        const result = elementApi.getLeaves('net1')
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.nodeIds.sort()).toEqual(['C', 'D'])
        }
      })
    })
  })
})
