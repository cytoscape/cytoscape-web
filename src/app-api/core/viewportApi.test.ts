// src/app-api/core/viewportApi.test.ts
// Plain Jest tests for viewportApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { viewportApi } from './viewportApi'

// ── Mock: RendererFunctionStore ───────────────────────────────────────────────

const mockGetFunction = jest.fn()

jest.mock('../../data/hooks/stores/RendererFunctionStore', () => ({
  useRendererFunctionStore: {
    getState: jest.fn(() => ({
      getFunction: mockGetFunction,
    })),
  },
}))

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const mockGetViewModel = jest.fn()
const mockUpdateNodePositions = jest.fn()

jest.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(() => ({
      getViewModel: mockGetViewModel,
      updateNodePositions: mockUpdateNodePositions,
    })),
  },
}))

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeNetworkView(nodeViews: Record<string, any> = {}) {
  return { nodeViews }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// --- fit ---------------------------------------------------------------------

describe('fit', () => {
  it('calls fit function and returns ok() when registered', async () => {
    const mockFitFn = jest.fn()
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
      expect(result.error.code).toBe(ApiErrorCode.FunctionNotAvailable)
    }
  })

  it('returns OperationFailed when fit function throws', async () => {
    const mockFitFn = jest.fn().mockImplementation(() => {
      throw new Error('renderer error')
    })
    mockGetFunction.mockReturnValue(mockFitFn)

    const result = await viewportApi.fit('net1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
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

  it('omits nodeIds not present in the view model', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({
        n1: { x: 10, y: 20 },
      }),
    )

    const result = viewportApi.getNodePositions('net1', ['n1', 'n_missing'])

    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.data.positions)).toEqual(['n1'])
    }
  })

  it('returns NetworkNotFound when view model does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = viewportApi.getNodePositions('missing', ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})

// --- updateNodePositions -----------------------------------------------------

describe('updateNodePositions', () => {
  it('converts PositionRecord to Map and calls store', () => {
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

  it('returns NetworkNotFound when view model does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = viewportApi.updateNodePositions('missing', { n1: [0, 0] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockUpdateNodePositions).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())
    mockUpdateNodePositions.mockImplementation(() => {
      throw new Error('store error')
    })

    const result = viewportApi.updateNodePositions('net1', { n1: [0, 0] })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })
})
