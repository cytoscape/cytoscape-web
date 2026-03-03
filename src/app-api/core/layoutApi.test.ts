// src/app-api/core/layoutApi.test.ts
// Plain Jest tests for layoutApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { layoutApi } from './layoutApi'

// ── Mock: dispatchCyWebEvent ──────────────────────────────────────────────────

jest.mock('../event-bus/dispatchCyWebEvent', () => ({
  dispatchCyWebEvent: jest.fn(),
}))

// Access the auto-mocked function after registration
let mockDispatchCyWebEvent: jest.Mock
beforeAll(() => {
  mockDispatchCyWebEvent =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../event-bus/dispatchCyWebEvent').dispatchCyWebEvent
})

// ── Mock: LayoutStore ─────────────────────────────────────────────────────────

const mockSetIsRunning = jest.fn()

const mockCircleAlgorithm = {
  name: 'circle',
  engineName: 'testEngine',
  displayName: 'Circle Layout',
  type: 'geometric',
  description: 'Arrange nodes in a circle',
  parameters: {},
}

const mockLayoutEngines = [
  {
    name: 'testEngine',
    defaultAlgorithmName: 'circle',
    algorithms: { circle: mockCircleAlgorithm },
    apply: jest.fn(),
  },
]

const mockPreferredLayout = mockCircleAlgorithm

const mockLayoutState = {
  layoutEngines: mockLayoutEngines,
  preferredLayout: mockPreferredLayout,
  isRunning: false,
  setIsRunning: mockSetIsRunning,
}

jest.mock('../../data/hooks/stores/LayoutStore', () => ({
  useLayoutStore: { getState: jest.fn(() => mockLayoutState) },
}))

// ── Mock: NetworkStore ────────────────────────────────────────────────────────

const mockNetworks = new Map<string, any>()

jest.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: { getState: jest.fn(() => ({ networks: mockNetworks })) },
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

// ── Mock: RendererFunctionStore ───────────────────────────────────────────────

const mockGetFunction = jest.fn()

jest.mock('../../data/hooks/stores/RendererFunctionStore', () => ({
  useRendererFunctionStore: {
    getState: jest.fn(() => ({ getFunction: mockGetFunction })),
  },
}))

// ── Mock: UiStateStore, WorkspaceStore, UndoStore (for corePostEdit) ─────────

const mockSetUndoStack = jest.fn()
const mockSetRedoStack = jest.fn()

jest.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: jest.fn(() => ({ ui: { activeNetworkView: '' } })),
  },
}))

jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({
      workspace: { currentNetworkId: 'net1' },
    })),
  },
}))

jest.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: jest.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
    })),
  },
}))

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockNetworks.clear()
  // Restore default layout state
  mockLayoutState.layoutEngines = mockLayoutEngines
  mockLayoutState.preferredLayout = mockPreferredLayout
  // Default: no view model
  mockGetViewModel.mockReturnValue(undefined)
  // Default: fit function available
  const mockFitFn = jest.fn()
  mockGetFunction.mockReturnValue(mockFitFn)
})

// ── getAvailableLayouts ────────────────────────────────────────────────────────

describe('getAvailableLayouts', () => {
  it('returns all algorithm infos from layout engines', () => {
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        engineName: 'testEngine',
        algorithmName: 'circle',
        displayName: 'Circle Layout',
        type: 'geometric',
      })
    }
  })

  it('returns empty array when no engines registered', () => {
    mockLayoutState.layoutEngines = []
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(0)
    }
  })

  it('returns all algorithms across multiple engines', () => {
    const extraEngine = {
      name: 'anotherEngine',
      defaultAlgorithmName: 'grid',
      algorithms: {
        grid: {
          name: 'grid',
          engineName: 'anotherEngine',
          displayName: 'Grid Layout',
          type: 'geometric',
          description: 'Arrange in grid',
          parameters: {},
        },
      },
      apply: jest.fn(),
    }
    mockLayoutState.layoutEngines = [...mockLayoutEngines, extraEngine] as any[]
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
    }
  })
})

// ── applyLayout — validation errors ──────────────────────────────────────────

describe('applyLayout — validation errors', () => {
  it('returns NetworkNotFound when network does not exist', async () => {
    const result = await layoutApi.applyLayout('nonexistent')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.NetworkNotFound)
    }
  })

  it('returns LayoutEngineNotFound for unknown algorithmName', async () => {
    mockNetworks.set('net1', { nodes: [], edges: [] })
    const result = await layoutApi.applyLayout('net1', {
      algorithmName: 'unknownAlgorithm',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.LayoutEngineNotFound)
    }
  })

  it('returns LayoutEngineNotFound when no engine supports preferredLayout', async () => {
    mockNetworks.set('net1', { nodes: [], edges: [] })
    mockLayoutState.preferredLayout = {
      name: 'nonexistentLayout',
      engineName: '',
      displayName: '',
      type: 'other',
      description: '',
      parameters: {},
    }
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.LayoutEngineNotFound)
    }
  })
})

// ── applyLayout — happy path ──────────────────────────────────────────────────

describe('applyLayout — happy path', () => {
  beforeEach(() => {
    mockNetworks.set('net1', {
      nodes: [{ id: 'node1' }],
      edges: [],
    })
    mockGetViewModel.mockReturnValue({
      nodeViews: { node1: { x: 0, y: 0 } },
    })
    // Engine immediately calls callback with new positions
    mockLayoutEngines[0].apply.mockImplementation(
      (nodes: any, edges: any, callback: any, algorithm: any) => {
        callback(new Map([['node1', [10, 20]]]))
      },
    )
  })

  it('resolves with ok() after layout completes', async () => {
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(true)
  })

  it('updates node positions via ViewModelStore', async () => {
    const newPositions = new Map([['node1', [10, 20]]])
    await layoutApi.applyLayout('net1')
    expect(mockUpdateNodePositions).toHaveBeenCalledWith('net1', newPositions)
  })

  it('dispatches layout:started before layout executes', async () => {
    await layoutApi.applyLayout('net1')
    const startedCall = mockDispatchCyWebEvent.mock.calls.find(
      ([type]: [string]) => type === 'layout:started',
    )
    expect(startedCall).toBeDefined()
    expect(startedCall[1]).toMatchObject({ networkId: 'net1', algorithm: 'circle' })
  })

  it('dispatches layout:completed after positions committed', async () => {
    await layoutApi.applyLayout('net1')
    const completedCall = mockDispatchCyWebEvent.mock.calls.find(
      ([type]: [string]) => type === 'layout:completed',
    )
    expect(completedCall).toBeDefined()
    expect(completedCall[1]).toMatchObject({ networkId: 'net1', algorithm: 'circle' })
  })

  it('sets isRunning true then false', async () => {
    await layoutApi.applyLayout('net1')
    expect(mockSetIsRunning).toHaveBeenNthCalledWith(1, true)
    expect(mockSetIsRunning).toHaveBeenNthCalledWith(2, false)
  })

  it('records undo via postEdit with APPLY_LAYOUT command', async () => {
    await layoutApi.applyLayout('net1')
    expect(mockSetUndoStack).toHaveBeenCalledWith('net1', expect.any(Array))
    const calls = mockSetUndoStack.mock.calls[0][1]
    expect(calls[0].undoCommand).toBe('APPLY_LAYOUT')
  })

  it('calls fit function when fitAfterLayout is true (default)', async () => {
    const mockFitFn = jest.fn()
    mockGetFunction.mockReturnValue(mockFitFn)
    await layoutApi.applyLayout('net1')
    expect(mockFitFn).toHaveBeenCalled()
  })

  it('does not call fit when fitAfterLayout is false', async () => {
    const mockFitFn = jest.fn()
    mockGetFunction.mockReturnValue(mockFitFn)
    await layoutApi.applyLayout('net1', { fitAfterLayout: false })
    expect(mockFitFn).not.toHaveBeenCalled()
  })

  it('layout succeeds when fit function is not registered (warning only)', async () => {
    mockGetFunction.mockReturnValue(undefined)
    const consoleSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Fit function not registered'))
    consoleSpy.mockRestore()
  })

  it('uses specified algorithmName to select engine', async () => {
    await layoutApi.applyLayout('net1', { algorithmName: 'circle' })
    expect(mockLayoutEngines[0].apply).toHaveBeenCalled()
  })
})
