// src/app-api/core/selectionApi.test.ts
// Plain Jest tests for selectionApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { selectionApi } from './selectionApi'

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const mockGetViewModel = jest.fn()
const mockExclusiveSelect = jest.fn()
const mockAdditiveSelect = jest.fn()
const mockAdditiveUnselect = jest.fn()
const mockToggleSelected = jest.fn()

jest.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(() => ({
      getViewModel: mockGetViewModel,
      exclusiveSelect: mockExclusiveSelect,
      additiveSelect: mockAdditiveSelect,
      additiveUnselect: mockAdditiveUnselect,
      toggleSelected: mockToggleSelected,
    })),
  },
}))

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeNetworkView(overrides?: {
  selectedNodes?: string[]
  selectedEdges?: string[]
}) {
  return {
    selectedNodes: overrides?.selectedNodes ?? [],
    selectedEdges: overrides?.selectedEdges ?? [],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// --- exclusiveSelect ---------------------------------------------------------

describe('exclusiveSelect', () => {
  it('returns ok() when network exists', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = selectionApi.exclusiveSelect('net1', ['n1'], ['e1'])

    expect(result.success).toBe(true)
    expect(mockExclusiveSelect).toHaveBeenCalledWith('net1', ['n1'], ['e1'])
  })

  it('returns NetworkNotFound when network does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = selectionApi.exclusiveSelect('missing', ['n1'], [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockExclusiveSelect).not.toHaveBeenCalled()
  })

  it('returns OperationFailed when store throws', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())
    mockExclusiveSelect.mockImplementation(() => {
      throw new Error('store error')
    })

    const result = selectionApi.exclusiveSelect('net1', [], [])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.OperationFailed)
    }
  })
})

// --- additiveSelect ----------------------------------------------------------

describe('additiveSelect', () => {
  it('returns ok() when network exists', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = selectionApi.additiveSelect('net1', ['n1', 'n2'])

    expect(result.success).toBe(true)
    expect(mockAdditiveSelect).toHaveBeenCalledWith('net1', ['n1', 'n2'])
  })

  it('returns NetworkNotFound when network does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = selectionApi.additiveSelect('missing', ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockAdditiveSelect).not.toHaveBeenCalled()
  })
})

// --- additiveUnselect --------------------------------------------------------

describe('additiveUnselect', () => {
  it('returns ok() when network exists', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = selectionApi.additiveUnselect('net1', ['n1'])

    expect(result.success).toBe(true)
    expect(mockAdditiveUnselect).toHaveBeenCalledWith('net1', ['n1'])
  })

  it('returns NetworkNotFound when network does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = selectionApi.additiveUnselect('missing', ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockAdditiveUnselect).not.toHaveBeenCalled()
  })
})

// --- toggleSelected ----------------------------------------------------------

describe('toggleSelected', () => {
  it('returns ok() when network exists', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = selectionApi.toggleSelected('net1', ['n1', 'e1'])

    expect(result.success).toBe(true)
    expect(mockToggleSelected).toHaveBeenCalledWith('net1', ['n1', 'e1'])
  })

  it('returns NetworkNotFound when network does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = selectionApi.toggleSelected('missing', ['n1'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
    expect(mockToggleSelected).not.toHaveBeenCalled()
  })
})

// --- getSelection ------------------------------------------------------------

describe('getSelection', () => {
  it('returns selected nodes and edges when network exists', () => {
    mockGetViewModel.mockReturnValue(
      makeNetworkView({ selectedNodes: ['n1', 'n2'], selectedEdges: ['e1'] }),
    )

    const result = selectionApi.getSelection('net1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedNodes).toEqual(['n1', 'n2'])
      expect(result.data.selectedEdges).toEqual(['e1'])
    }
  })

  it('returns empty arrays when nothing is selected', () => {
    mockGetViewModel.mockReturnValue(makeNetworkView())

    const result = selectionApi.getSelection('net1')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.selectedNodes).toEqual([])
      expect(result.data.selectedEdges).toEqual([])
    }
  })

  it('returns NetworkNotFound when network does not exist', () => {
    mockGetViewModel.mockReturnValue(undefined)

    const result = selectionApi.getSelection('missing')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })
})
