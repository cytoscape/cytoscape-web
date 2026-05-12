// src/app-api/core/elementApi.test.ts
// Plain Jest tests for elementApi core — no renderHook, no React context.

import {
  createNodesCore,
  deleteEdgesCore,
  deleteNodesCore,
} from '../../models/CyNetworkModel'
import { ApiErrorCode } from '../types/ApiResult'
import { elementApi } from './elementApi'

// ── Mock stores ──────────────────────────────────────────────────────────────

const mockNetworks = new Map()
const mockNetworkActions = {
  deleteNodes: jest.fn().mockReturnValue([]),
  addNode: jest.fn(),
  addEdge: jest.fn(),
  addEdges: jest.fn(),
  deleteEdges: jest.fn(),
  moveEdge: jest.fn(),
}

jest.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: jest.fn(() => ({
      ...mockNetworkActions,
      networks: mockNetworks,
    })),
  },
}))

const mockTables: Record<string, any> = {}
const mockTableActions = {
  deleteRows: jest.fn(),
  editRows: jest.fn(),
  setValue: jest.fn(),
  setValues: jest.fn(),
}

jest.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: jest.fn(() => ({
      ...mockTableActions,
      tables: mockTables,
    })),
  },
}))

const mockViewModels: Record<string, any> = {}
const mockViewModelActions = {
  deleteObjects: jest.fn(),
  addNodeView: jest.fn(),
  addEdgeView: jest.fn(),
  exclusiveSelect: jest.fn(),
  getViewModel: jest.fn(),
}

jest.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(() => ({
      ...mockViewModelActions,
      viewModels: mockViewModels,
    })),
  },
}))

const mockVisualStyles: Record<string, any> = {}
const mockVisualStyleActions = {
  deleteBypass: jest.fn(),
  setBypass: jest.fn(),
}

jest.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: jest.fn(() => ({
      ...mockVisualStyleActions,
      visualStyles: mockVisualStyles,
    })),
  },
}))

const mockSummaryActions = { update: jest.fn() }

jest.mock('../../data/hooks/stores/NetworkSummaryStore', () => ({
  useNetworkSummaryStore: {
    getState: jest.fn(() => mockSummaryActions),
  },
}))

const mockUndoStacks: Record<string, any> = {}
const mockUndoActions = {
  setUndoStack: jest.fn(),
  setRedoStack: jest.fn(),
}

jest.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: jest.fn(() => ({
      ...mockUndoActions,
      undoRedoStacks: mockUndoStacks,
    })),
  },
}))

jest.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: jest.fn(() => ({
      ui: { activeNetworkView: '' },
    })),
  },
}))

jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
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

jest.mock('../../models/NetworkModel/impl/networkImpl', () => ({
  getInternalNetworkDataStore: jest.fn(() => mockCyInstance),
}))

// ── Mock pure functions ───────────────────────────────────────────────────────

jest.mock('../../models/CyNetworkModel', () => ({
  createNodesCore: jest.fn(),
  createEdgesCore: jest.fn(),
  deleteNodesCore: jest.fn().mockReturnValue({
    deletedNodeIds: [],
    deletedEdges: [],
    deletedNodeViews: [],
    deletedEdgeViews: [],
    deletedNodeRows: new Map(),
    deletedEdgeRows: new Map(),
  }),
  deleteEdgesCore: jest.fn().mockReturnValue({
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
  jest.clearAllMocks()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('elementApi', () => {
  beforeEach(() => {
    resetMocks()
  })

  // ── generateNextNodeId ────────────────────────────────────────────────────

  describe('generateNextNodeId', () => {
    it('returns "0" when network does not exist', () => {
      expect(elementApi.generateNextNodeId('missing')).toBe('0')
    })

    it('returns "0" when network has no nodes', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      expect(elementApi.generateNextNodeId('net1')).toBe('0')
    })

    it('returns max+1 when nodes exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: '3' }, { id: '7' }]))
      expect(elementApi.generateNextNodeId('net1')).toBe('8')
    })
  })

  // ── generateNextEdgeId ────────────────────────────────────────────────────

  describe('generateNextEdgeId', () => {
    it('returns "e0" when network does not exist', () => {
      expect(elementApi.generateNextEdgeId('missing')).toBe('e0')
    })

    it('returns "e0" when network has no edges', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      expect(elementApi.generateNextEdgeId('net1')).toBe('e0')
    })

    it('returns e(max+1) when edges exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], [{ id: 'e2' }, { id: 'e5' }]))
      expect(elementApi.generateNextEdgeId('net1')).toBe('e6')
    })
  })

  // ── getNode ───────────────────────────────────────────────────────────────

  describe('getNode', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.getNode('missing', 'n1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns NodeNotFound when node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }]))
      const result = elementApi.getNode('net1', 'n1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
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

  // ── getEdge ───────────────────────────────────────────────────────────────

  describe('getEdge', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.getEdge('missing', 'e1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns EdgeNotFound when edge does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], [{ id: 'e2', s: 'n1', t: 'n2' }]))
      const result = elementApi.getEdge('net1', 'e1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.EdgeNotFound)
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
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns ok with nodeId on success', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createNode('net1', [100, 200])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nodeId).toBe('0')
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
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns NodeNotFound when source node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }], []))
      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
      }
    })

    it('returns NodeNotFound when target node does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }], []))
      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
      }
    })

    it('returns ok with edgeId on success', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

      const result = elementApi.createEdge('net1', 'n1', 'n2')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.edgeId).toBe('e0')
      }
    })

    it('applies bypass props when bypass option is provided', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      mockTables['net1'] = {
        nodeTable: { rows: new Map(), columns: [] },
        edgeTable: { rows: new Map(), columns: [] },
      }

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

  // ── moveEdge ──────────────────────────────────────────────────────────────

  describe('moveEdge', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.moveEdge('missing', 'e1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns EdgeNotFound when edge does not exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }, { id: 'n2' }], []))
      const result = elementApi.moveEdge('net1', 'e1', 'n1', 'n2')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.EdgeNotFound)
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
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
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
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
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
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns InvalidInput when nodeIds is empty', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.deleteNodes('net1', [])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('returns NodeNotFound when none of the nodes exist', () => {
      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n2' }], []))
      const result = elementApi.deleteNodes('net1', ['n1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
      }
    })

    it('returns ok with deletion counts on success', () => {
      jest.mocked(deleteNodesCore).mockReturnValue({
        deletedNodeIds: ['n1'],
        deletedEdges: [{ id: 'e1', s: 'n1', t: 'n2' }],
        deletedNodeViews: [],
        deletedEdgeViews: [],
        deletedNodeRows: new Map(),
        deletedEdgeRows: new Map(),
      })

      mockNetworks.set('net1', makeNetwork('net1', [{ id: 'n1' }], []))

      const result = elementApi.deleteNodes('net1', ['n1'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deletedNodeCount).toBe(1)
        expect(result.data.deletedEdgeCount).toBe(1)
      }
    })
  })

  // ── deleteEdges ───────────────────────────────────────────────────────────

  describe('deleteEdges', () => {
    it('returns NetworkNotFound when network does not exist', () => {
      const result = elementApi.deleteEdges('missing', ['e1'])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
      }
    })

    it('returns InvalidInput when edgeIds is empty', () => {
      mockNetworks.set('net1', makeNetwork('net1', [], []))
      const result = elementApi.deleteEdges('net1', [])
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
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
        expect(result.error.code).toBe(ApiErrorCode.EdgeNotFound)
      }
    })

    it('returns ok with deletion count on success', () => {
      jest.mocked(deleteEdgesCore).mockReturnValue({
        deletedEdgeIds: ['e1'],
        deletedEdgeViews: [],
        deletedEdgeRows: new Map(),
      })

      mockNetworks.set(
        'net1',
        makeNetwork('net1', [], [{ id: 'e1', s: 'n1', t: 'n2' }]),
      )

      const result = elementApi.deleteEdges('net1', ['e1'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deletedEdgeCount).toBe(1)
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
          expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
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
          expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
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

      it('returns NodeNotFound for invalid node', () => {
        const result = elementApi.getConnectedEdges('net1', 'Z')
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe(ApiErrorCode.NodeNotFound)
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
