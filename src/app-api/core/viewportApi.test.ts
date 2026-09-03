import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/viewportApi.test.ts
// Plain Jest tests for viewportApi core — no renderHook, no React context.
import { AppCodes, ElementCodes } from '../types/ApiResult'
import { viewportApi } from './viewportApi'

// ── Mock: WorkspaceStore (markNetworkModified) ───────────────────────────────

const mockSetNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { currentNetworkId: 'net1', networkModified: {} },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

// ── Mock: RendererFunctionStore ───────────────────────────────────────────────

const mockGetFunction = vi.fn()

vi.mock('../../data/hooks/stores/RendererFunctionStore', () => ({
  useRendererFunctionStore: {
    getState: vi.fn(() => ({
      getFunction: mockGetFunction,
    })),
  },
}))

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const mockGetViewModel = vi.fn()
const mockUpdateNodePositions = vi.fn()

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: vi.fn(() => ({
      getViewModel: mockGetViewModel,
      updateNodePositions: mockUpdateNodePositions,
    })),
  },
}))

// ── Mock: NetworkStore (for node-existence checks) ───────────────────────────

const mockNetworks = new Map<string, any>()

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({
      networks: mockNetworks,
    })),
  },
}))

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeNetworkView(nodeViews: Record<string, any> = {}) {
  return { nodeViews }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockNetworks.clear()
})

// --- fit ---------------------------------------------------------------------

describe('fit', () => {
  it('calls fit function and returns ok() when registered', async () => {
    const mockFitFn = vi.fn()
    mockGetFunction.mockReturnValue(mockFitFn)

    const result = await viewportApi.fit('net1')

    expect(result.success).toBe(true)
    expect(mockGetFunction).toHaveBeenCalledWith('cyjs', 'fit', 'net1')
    expect(mockFitFn).toHaveBeenCalled()
  })

  it('returns FunctionNotAvailable when fit function is not registered', async () => {
    mockGetFunction.mockReturnValue(undefined)

    const result = await viewportApi.fit('net1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.FUNCTION_NOT_AVAILABLE.code)
    }
  })

  it('returns OperationFailed when fit function throws', async () => {
    const mockFitFn = vi.fn().mockImplementation(() => {
      throw new Error('renderer error')
    })
    mockGetFunction.mockReturnValue(mockFitFn)

    const result = await viewportApi.fit('net1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.OPERATION_FAILED.code)
    }
  })
})

// --- getNodePositions --------------------------------------------------------

describe('getNodePositions', () => {
  it('returns positions for requested nodes (2D)', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({
        n1: { x: 10, y: 20 },
        n2: { x: 30, y: 40 },
        n3: { x: 50, y: 60 },
      }),
    )

    const result = viewportApi.getNodePositions('net1', ['n1', 'n2'])

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.positions).toEqual({
        n1: [10, 20],
        n2: [30, 40],
      })
      // n3 should not be included (not requested)
      expect(result.data.positions['n3']).toBeUndefined()
    }
  })

  it('includes z coordinate when present', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({
        n1: { x: 10, y: 20, z: 5 },
      }),
    )

    const result = viewportApi.getNodePositions('net1', ['n1'])

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.positions['n1']).toEqual([10, 20, 5])
    }
  })

  it('omits nodeIds not present in the view model and reports them in missing', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({
        n1: { x: 10, y: 20 },
      }),
    )

    const result = viewportApi.getNodePositions('net1', ['n1', 'n_missing'])

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.data.positions)).toEqual(['n1'])
      expect(result.data.missing).toEqual(['n_missing'])
    }
  })

  it('returns every node position when nodeIds is omitted', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({
        n1: { x: 10, y: 20 },
        n2: { x: 30, y: 40 },
      }),
    )
    mockNetworks.set('net1', {
      nodes: [{ id: 'n1' }, { id: 'n2' }],
    })

    const result = viewportApi.getNodePositions('net1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.positions).toEqual({
        n1: [10, 20],
        n2: [30, 40],
      })
      expect(result.data.missing).toEqual([])
    }
  })

  it('returns NetworkNotFound when view model does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = viewportApi.getNodePositions('missing', ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })
})

// --- updateNodePositions -----------------------------------------------------

describe('updateNodePositions', () => {
  const setupNetwork = (): void => {
    mockNetworks.set('net1', {
      id: 'net1',
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [],
    })
  }

  it('converts PositionRecord to Map and calls store', () => {
    setupNetwork()
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const positions = {
      n1: [10, 20] as [number, number],
      n2: [30, 40, 5] as [number, number, number],
    }

    const result = viewportApi.updateNodePositions('net1', positions)

    expect(result.success).toBe(true)
    expect(mockUpdateNodePositions).toHaveBeenCalledWith(
      'net1',
      new Map([
        ['n1', [10, 20]],
        ['n2', [30, 40, 5]],
      ]),
    )
  })

  it('rejects positions for nodes that do not exist (CX2 GL1)', () => {
    setupNetwork()
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = viewportApi.updateNodePositions('net1', {
      n1: [0, 0],
      ghost: [10, 10],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
      expect(result.error.message).toContain('ghost')
    }
    expect(mockUpdateNodePositions).not.toHaveBeenCalled()
  })

  it('rejects positions for edge IDs (positions are node-only)', () => {
    mockNetworks.set('net1', {
      id: 'net1',
      nodes: [{ id: 'n1' }],
      edges: [{ id: 'e0', s: 'n1', t: 'n1' }],
    })
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = viewportApi.updateNodePositions('net1', { e0: [5, 5] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ElementCodes.NODE_NOT_FOUND.code)
    }
  })

  it('returns NetworkNotFound when view model does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = viewportApi.updateNodePositions('missing', { n1: [0, 0] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
    expect(mockUpdateNodePositions).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    setupNetwork()
    mockGetViewModel.mockReturnValue(makeNetworkView())
    mockUpdateNodePositions.mockImplementation(() => {
      throw new Error('store error')
    })

    const result = viewportApi.updateNodePositions('net1', { n1: [0, 0] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.OPERATION_FAILED.code)
    }
  })
})

// --- networkModified flag (#680) ---------------------------------------------

describe('networkModified (#680)', () => {
  beforeEach(() => {
    // An earlier test leaves a throwing implementation behind — clearAllMocks
    // clears calls, not implementations.
    mockUpdateNodePositions.mockReset()
  })

  it('updateNodePositions marks the written network, not currentNetworkId', () => {
    // net1 is currentNetworkId in the WorkspaceStore mock
    mockNetworks.set('net2', { id: 'net2', nodes: [{ id: 'n1' }], edges: [] })
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = viewportApi.updateNodePositions('net2', {
      n1: [1, 2] as [number, number],
    })

    expect(result.success).toBe(true)
    expect(mockSetNetworkModified).toHaveBeenCalledWith('net2', true)
    expect(mockSetNetworkModified).not.toHaveBeenCalledWith('net1', true)
  })

  it('does not mark when a position names a node that does not exist', () => {
    mockNetworks.set('net2', { id: 'net2', nodes: [{ id: 'n1' }], edges: [] })
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = viewportApi.updateNodePositions('net2', {
      ghost: [1, 2] as [number, number],
    })

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('does not mark when the network has no view model', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = viewportApi.updateNodePositions('net2', {
      n1: [1, 2] as [number, number],
    })

    expect(result.success).toBe(false)
    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })
})
