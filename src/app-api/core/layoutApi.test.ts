import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dispatchCyWebEvent } from '../event-bus/dispatchCyWebEvent'
// src/app-api/core/layoutApi.test.ts
// Plain Jest tests for layoutApi core — no renderHook, no React context.
import { AppCodes } from '../types/ApiResult'
import { layoutApi } from './layoutApi'

// ── Mock: dispatchCyWebEvent ──────────────────────────────────────────────────

vi.mock('../event-bus/dispatchCyWebEvent', () => ({
  dispatchCyWebEvent: vi.fn(),
}))

// Access the auto-mocked function after registration
const mockDispatchCyWebEvent = vi.mocked(dispatchCyWebEvent)

// ── Mock: LayoutStore ─────────────────────────────────────────────────────────

// startLayout claims the single run slot (#982); setIsRunning lowers it.
// Both notify subscribers like the real store, which `waitIfBusy` waits on.
const mockLayoutListeners = new Set<() => void>()
const notifyLayoutListeners = (): void => {
  for (const listener of mockLayoutListeners) listener()
}
const mockSetIsRunning = vi.fn((isRunning: boolean) => {
  mockLayoutState.isRunning = isRunning
  notifyLayoutListeners()
})
// While layouts wait (layoutQueued), only the queue's own claim may start.
const mockStartLayout = vi.fn(
  (_networkId: string, options?: { fromQueue?: boolean }): boolean => {
    if (mockLayoutState.isRunning) return false
    if (mockLayoutState.layoutQueued && options?.fromQueue !== true) {
      return false
    }
    mockLayoutState.isRunning = true
    notifyLayoutListeners()
    return true
  },
)
const mockSetLayoutQueued = vi.fn((queued: boolean) => {
  mockLayoutState.layoutQueued = queued
  notifyLayoutListeners()
})

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
    apply: vi.fn(),
  },
]

const mockPreferredLayout = mockCircleAlgorithm

const mockLayoutState = {
  layoutEngines: mockLayoutEngines,
  preferredLayout: mockPreferredLayout,
  isRunning: false,
  layoutQueued: false,
  setIsRunning: mockSetIsRunning,
  startLayout: mockStartLayout,
  setLayoutQueued: mockSetLayoutQueued,
}

vi.mock('../../data/hooks/stores/LayoutStore', () => ({
  useLayoutStore: {
    getState: vi.fn(() => mockLayoutState),
    subscribe: vi.fn((listener: () => void) => {
      mockLayoutListeners.add(listener)
      return () => mockLayoutListeners.delete(listener)
    }),
  },
}))

// ── Mock: NetworkStore ────────────────────────────────────────────────────────

const mockNetworks = new Map<string, any>()
const mockNetworkListeners = new Set<(state: any) => void>()
/** Delete a network and notify, as NetworkStore.delete does. */
const deleteMockNetwork = (id: string): void => {
  mockNetworks.delete(id)
  for (const listener of mockNetworkListeners) {
    listener({ networks: mockNetworks })
  }
}

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({ networks: mockNetworks })),
    subscribe: vi.fn((listener: (state: any) => void) => {
      mockNetworkListeners.add(listener)
      return () => mockNetworkListeners.delete(listener)
    }),
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

// ── Mock: RendererFunctionStore ───────────────────────────────────────────────

const mockGetFunction = vi.fn()

vi.mock('../../data/hooks/stores/RendererFunctionStore', () => ({
  useRendererFunctionStore: {
    getState: vi.fn(() => ({ getFunction: mockGetFunction })),
  },
}))

// ── Mock: UiStateStore, WorkspaceStore, UndoStore (for corePostEdit) ─────────

const mockSetUndoStack = vi.fn()
const mockSetRedoStack = vi.fn()

vi.mock('../../data/hooks/stores/UiStateStore', () => ({
  useUiStateStore: {
    getState: vi.fn(() => ({ ui: { activeNetworkView: '' } })),
  },
}))

const mockSetNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { currentNetworkId: 'net1', networkModified: {} },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      undoRedoStacks: {},
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
    })),
  },
}))

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockNetworks.clear()
  // Restore default layout state
  mockLayoutState.layoutEngines = mockLayoutEngines
  mockLayoutState.preferredLayout = mockPreferredLayout
  mockLayoutState.isRunning = false
  mockLayoutState.layoutQueued = false
  mockLayoutListeners.clear()
  mockNetworkListeners.clear()
  // Default: no view model
  mockGetViewModel.mockReturnValue(undefined)
  // Default: fit function available
  const mockFitFn = vi.fn()
  mockGetFunction.mockReturnValue(mockFitFn)
})

// ── getAvailableLayouts ────────────────────────────────────────────────────────

describe('getAvailableLayouts', () => {
  it('returns all algorithm infos from layout engines', () => {
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layouts).toHaveLength(1)
      expect(result.data.layouts[0]).toMatchObject({
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
      expect(result.data.layouts).toHaveLength(0)
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
      apply: vi.fn(),
    }
    mockLayoutState.layoutEngines = [...mockLayoutEngines, extraEngine] as any[]
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layouts).toHaveLength(2)
    }
  })

  it('reports appId only for app-registered engines, with the qualified name', () => {
    const appEngine = {
      name: 'mcode',
      appId: 'mcode',
      defaultAlgorithmName: 'mcode::cluster',
      algorithms: {
        'mcode::cluster': {
          name: 'mcode::cluster',
          engineName: 'mcode',
          displayName: 'MCODE Cluster Layout',
          type: 'other',
          description: '',
          parameters: {},
        },
      },
      apply: vi.fn(),
    }
    mockLayoutState.layoutEngines = [...mockLayoutEngines, appEngine] as any[]
    const result = layoutApi.getAvailableLayouts()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.layouts[0]).not.toHaveProperty('appId')
      expect(result.data.layouts[1]).toMatchObject({
        engineName: 'mcode',
        algorithmName: 'mcode::cluster',
        appId: 'mcode',
      })
    }
  })
})

// ── applyLayout — validation errors ──────────────────────────────────────────

describe('applyLayout — validation errors', () => {
  it('returns NetworkNotFound when network does not exist', async () => {
    const result = await layoutApi.applyLayout('nonexistent')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.NETWORK_NOT_FOUND.code)
    }
  })

  it('returns LayoutEngineNotFound for unknown algorithmName', async () => {
    mockNetworks.set('net1', { nodes: [], edges: [] })
    const result = await layoutApi.applyLayout('net1', {
      algorithmName: 'unknownAlgorithm',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.LAYOUT_ENGINE_NOT_FOUND.code)
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
      expect(result.error.code).toBe(AppCodes.LAYOUT_ENGINE_NOT_FOUND.code)
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
      (nodes: any, edges: any, callback: any) => {
        callback(new Map([['node1', [10, 20]]]))
      },
    )
  })

  it('resolves with ok() after layout completes', async () => {
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(true)
  })

  it('hands the network id to the engine as the fifth apply argument', async () => {
    await layoutApi.applyLayout('net1')
    const call = mockLayoutEngines[0].apply.mock.calls[0]
    expect(call[3]).toBe(mockCircleAlgorithm)
    expect(call[4]).toBe('net1')
  })

  it('updates node positions via ViewModelStore', async () => {
    const newPositions = new Map([['node1', [10, 20]]])
    await layoutApi.applyLayout('net1')
    expect(mockUpdateNodePositions).toHaveBeenCalledWith('net1', newPositions)
  })

  it('dispatches layout:started before layout executes', async () => {
    await layoutApi.applyLayout('net1')
    const startedCall = mockDispatchCyWebEvent.mock.calls.find(
      ([type]) => type === 'layout:started',
    )
    expect(startedCall).toBeDefined()
    expect(startedCall![1]).toMatchObject({
      networkId: 'net1',
      algorithm: 'circle',
    })
  })

  it('dispatches layout:completed after positions committed', async () => {
    await layoutApi.applyLayout('net1')
    const completedCall = mockDispatchCyWebEvent.mock.calls.find(
      ([type]) => type === 'layout:completed',
    )
    expect(completedCall).toBeDefined()
    expect(completedCall![1]).toMatchObject({
      networkId: 'net1',
      algorithm: 'circle',
    })
  })

  it('claims the run for the network, then lowers the flag', async () => {
    await layoutApi.applyLayout('net1')
    expect(mockStartLayout).toHaveBeenCalledWith('net1')
    expect(mockSetIsRunning).toHaveBeenCalledTimes(1)
    expect(mockSetIsRunning).toHaveBeenCalledWith(false)
  })

  it('records undo via postEdit with APPLY_LAYOUT command', async () => {
    await layoutApi.applyLayout('net1')
    expect(mockSetUndoStack).toHaveBeenCalledWith('net1', expect.any(Array))
    const calls = mockSetUndoStack.mock.calls[0][1]
    expect(calls[0].undoCommand).toBe('APPLY_LAYOUT')
  })

  it('calls fit function when fitAfterLayout is true (default)', async () => {
    const mockFitFn = vi.fn()
    mockGetFunction.mockReturnValue(mockFitFn)
    await layoutApi.applyLayout('net1')
    expect(mockFitFn).toHaveBeenCalled()
  })

  it('does not call fit when fitAfterLayout is false', async () => {
    const mockFitFn = vi.fn()
    mockGetFunction.mockReturnValue(mockFitFn)
    await layoutApi.applyLayout('net1', { fitAfterLayout: false })
    expect(mockFitFn).not.toHaveBeenCalled()
  })

  it('layout succeeds when fit function is not registered (warning only)', async () => {
    mockGetFunction.mockReturnValue(undefined)
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(true)
  })

  it('uses specified algorithmName to select engine', async () => {
    await layoutApi.applyLayout('net1', { algorithmName: 'circle' })
    expect(mockLayoutEngines[0].apply).toHaveBeenCalled()
  })

  it('records undo on the stack of the laid-out network, not the current one', async () => {
    // WorkspaceStore mock reports currentNetworkId 'net1'; lay out 'net2'.
    mockNetworks.set('net2', { nodes: [{ id: 'node1' }], edges: [] })
    await layoutApi.applyLayout('net2')
    expect(mockSetUndoStack).toHaveBeenCalledWith('net2', expect.any(Array))
  })
})

// ── applyLayout — engine failure ──────────────────────────────────────────────

describe('applyLayout — engine failure', () => {
  beforeEach(() => {
    mockNetworks.set('net1', { nodes: [{ id: 'node1' }], edges: [] })
    mockLayoutEngines[0].apply.mockImplementation(() => {
      throw new Error('malformed engine')
    })
  })

  // The throwing implementation outlives clearAllMocks (which clears calls,
  // not implementations), so it must be reset or it leaks into later suites
  afterEach(() => {
    mockLayoutEngines[0].apply.mockReset()
  })

  it('resolves fail() instead of throwing when engine.apply throws synchronously', async () => {
    // Must not reject — the API contract is "never throw across the boundary"
    const result = await layoutApi.applyLayout('net1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.OPERATION_FAILED.code)
      expect(result.error.message).toContain('malformed engine')
    }
  })

  it('resets isRunning to false when engine.apply throws synchronously', async () => {
    await layoutApi.applyLayout('net1')
    expect(mockStartLayout).toHaveBeenCalledWith('net1')
    expect(mockSetIsRunning).toHaveBeenCalledWith(false)
    expect(mockLayoutState.isRunning).toBe(false)
  })

  it('does not dispatch layout:completed when the engine throws', async () => {
    await layoutApi.applyLayout('net1')
    const completedCall = mockDispatchCyWebEvent.mock.calls.find(
      ([type]) => type === 'layout:completed',
    )
    expect(completedCall).toBeUndefined()
  })
})

// #982: one layout at a time. An app or agent calling applyLayout while
// another layout runs gets a failure instead of a second run that would
// overwrite the first's positions and lower its running flag.
describe('applyLayout — a layout is already running', () => {
  beforeEach(() => {
    mockNetworks.set('net1', { nodes: [{ id: 'node1' }], edges: [] })
    mockLayoutState.isRunning = true
  })

  it('fails with LAYOUT_ALREADY_RUNNING and starts nothing', async () => {
    const result = await layoutApi.applyLayout('net1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.LAYOUT_ALREADY_RUNNING.code)
    }
    expect(mockLayoutEngines[0].apply).not.toHaveBeenCalled()
    expect(mockUpdateNodePositions).not.toHaveBeenCalled()
    expect(mockSetUndoStack).not.toHaveBeenCalled()
  })

  it('leaves the flag of the running layout up and dispatches no layout event', async () => {
    await layoutApi.applyLayout('net1')

    expect(mockSetIsRunning).not.toHaveBeenCalled()
    expect(mockLayoutState.isRunning).toBe(true)
    expect(mockDispatchCyWebEvent).not.toHaveBeenCalled()
  })

  it('refuses the second of two calls made at once, and only the first applies', async () => {
    mockLayoutState.isRunning = false
    let finish: (positions: Map<string, [number, number]>) => void = () => {}
    mockLayoutEngines[0].apply.mockImplementation(
      (_nodes: any, _edges: any, callback: any) => {
        finish = callback
      },
    )

    const first = layoutApi.applyLayout('net1')
    const second = await layoutApi.applyLayout('net1')
    expect(second.success).toBe(false)

    finish(new Map([['node1', [10, 20]]]))
    expect((await first).success).toBe(true)
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(1)
    expect(mockSetUndoStack).toHaveBeenCalledTimes(1)
    mockLayoutEngines[0].apply.mockReset()
  })
})

// An app that lays out several networks in a loop can ask applyLayout to
// wait for a running layout instead of failing with APP16. The call then
// starts as soon as that layout ends, through the same queue the host's
// automatic layouts use, and resolves once its own layout has run.
describe('applyLayout — waitIfBusy', () => {
  let finishers: Array<(positions: Map<string, [number, number]>) => void>

  beforeEach(() => {
    finishers = []
    mockNetworks.set('net1', { nodes: [{ id: 'node1' }], edges: [] })
    mockNetworks.set('net2', { nodes: [{ id: 'node1' }], edges: [] })
    mockGetViewModel.mockReturnValue({ nodeViews: { node1: { x: 0, y: 0 } } })
    // Each run completes only when the test finishes it.
    mockLayoutEngines[0].apply.mockImplementation(
      (_nodes: any, _edges: any, callback: any) => {
        finishers.push(callback)
      },
    )
  })

  afterEach(() => {
    mockLayoutEngines[0].apply.mockReset()
  })

  /** A layout someone else started (the user, an automatic layout). */
  const occupy = (): void => {
    mockStartLayout('other-net')
  }
  const release = (): void => {
    mockSetIsRunning(false)
  }
  const flush = async (): Promise<void> => {
    await Promise.resolve()
    await Promise.resolve()
  }

  it('waits for the running layout, then runs and resolves ok', async () => {
    occupy()
    let settled = false
    const call = layoutApi
      .applyLayout('net1', { waitIfBusy: true })
      .then((result) => {
        settled = true
        return result
      })
    await flush()

    expect(settled).toBe(false)
    expect(mockLayoutEngines[0].apply).not.toHaveBeenCalled()
    expect(mockDispatchCyWebEvent).not.toHaveBeenCalled()

    release()
    await flush()
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(1)
    // On its turn, through the queue's claim
    expect(mockStartLayout).toHaveBeenLastCalledWith('net1', {
      fromQueue: true,
    })
    expect(mockDispatchCyWebEvent).toHaveBeenCalledWith('layout:started', {
      networkId: 'net1',
      algorithm: 'circle',
    })

    finishers[0](new Map([['node1', [10, 20]]]))
    expect((await call).success).toBe(true)
    expect(mockSetUndoStack).toHaveBeenCalledTimes(1)
    expect(mockLayoutState.isRunning).toBe(false)
  })

  it('starts at once when no layout runs', async () => {
    const call = layoutApi.applyLayout('net1', { waitIfBusy: true })
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(1)

    finishers[0](new Map([['node1', [10, 20]]]))
    expect((await call).success).toBe(true)
  })

  it('records for undo the positions from when it starts, not from when it was called', async () => {
    occupy()
    const call = layoutApi.applyLayout('net1', { waitIfBusy: true })
    // The running layout moves the node before this one gets its turn.
    mockGetViewModel.mockReturnValue({ nodeViews: { node1: { x: 7, y: 8 } } })
    release()
    await flush()
    finishers[0](new Map([['node1', [10, 20]]]))
    await call

    const [edit] = mockSetUndoStack.mock.calls[0][1]
    expect(edit.undoParams).toEqual(['net1', new Map([['node1', [7, 8]]])])
  })

  it('runs calls made together one after another, each once, so a loop never sees APP16', async () => {
    const first = layoutApi.applyLayout('net1', { waitIfBusy: true })
    const second = layoutApi.applyLayout('net2', { waitIfBusy: true })
    const third = layoutApi.applyLayout('net1', { waitIfBusy: true })
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(1)

    finishers[0](new Map([['node1', [1, 1]]]))
    await flush()
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(2)
    finishers[1](new Map([['node1', [2, 2]]]))
    await flush()
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(3)
    finishers[2](new Map([['node1', [3, 3]]]))

    const results = await Promise.all([first, second, third])
    expect(results.map((r) => r.success)).toEqual([true, true, true])
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(3)
    expect(mockSetUndoStack).toHaveBeenCalledTimes(3)
  })

  // Seen in the running app: the next call started inside the previous
  // layout's completion callback, so its layout:started came before the
  // previous layout:completed.
  it('reports the previous layout:completed before the next layout:started', async () => {
    const first = layoutApi.applyLayout('net1', { waitIfBusy: true })
    const second = layoutApi.applyLayout('net2', { waitIfBusy: true })

    finishers[0](new Map([['node1', [1, 1]]]))
    await flush()
    finishers[1](new Map([['node1', [2, 2]]]))
    await Promise.all([first, second])

    const events = mockDispatchCyWebEvent.mock.calls.map(
      ([type, detail]) => `${type} ${(detail as any).networkId}`,
    )
    expect(events).toEqual([
      'layout:started net1',
      'layout:completed net1',
      'layout:started net2',
      'layout:completed net2',
    ])
  })

  it('fails at once, without waiting, for an unknown network or algorithm', async () => {
    occupy()

    const noNetwork = await layoutApi.applyLayout('nope', { waitIfBusy: true })
    const noAlgorithm = await layoutApi.applyLayout('net1', {
      waitIfBusy: true,
      algorithmName: 'nope',
    })

    expect(!noNetwork.success && noNetwork.error.code).toBe(
      AppCodes.NETWORK_NOT_FOUND.code,
    )
    expect(!noAlgorithm.success && noAlgorithm.error.code).toBe(
      AppCodes.LAYOUT_ENGINE_NOT_FOUND.code,
    )
    expect(mockLayoutListeners.size).toBe(0)
  })

  it('fails with NETWORK_NOT_FOUND at once, running nothing, when the network is deleted while it waits', async () => {
    occupy()
    const call = layoutApi.applyLayout('net1', { waitIfBusy: true })
    deleteMockNetwork('net1')

    // Settled without waiting for the running layout
    const result = await call
    expect(!result.success && result.error.code).toBe(
      AppCodes.NETWORK_NOT_FOUND.code,
    )
    expect(mockLayoutEngines[0].apply).not.toHaveBeenCalled()
    release()
    await flush()
    expect(mockLayoutEngines[0].apply).not.toHaveBeenCalled()
    expect(mockLayoutState.isRunning).toBe(false)
  })

  // Review of #985: a call made from a synchronous layout:completed listener
  // used to take the freed slot ahead of a call already waiting for it.
  it('does not let a start from a layout:completed listener jump ahead of a waiting call', async () => {
    let jumper: Promise<any> | undefined
    mockDispatchCyWebEvent.mockImplementation((type: string, detail: any) => {
      if (type === 'layout:completed' && detail.networkId === 'net1') {
        jumper = layoutApi.applyLayout('net1')
      }
    })
    const first = layoutApi.applyLayout('net1')
    const waiting = layoutApi.applyLayout('net2', { waitIfBusy: true })

    finishers[0](new Map([['node1', [1, 1]]]))
    await flush()

    const jumped = await jumper
    expect(!jumped.success && jumped.error.code).toBe(
      AppCodes.LAYOUT_ALREADY_RUNNING.code,
    )
    expect(mockLayoutEngines[0].apply).toHaveBeenCalledTimes(2)
    expect(mockLayoutEngines[0].apply.mock.calls[1][4]).toBe('net2')

    finishers[1](new Map([['node1', [2, 2]]]))
    expect((await first).success).toBe(true)
    expect((await waiting).success).toBe(true)
    mockDispatchCyWebEvent.mockReset()
  })

  it('still fails with LAYOUT_ALREADY_RUNNING without the option, or with false', async () => {
    occupy()

    for (const options of [{}, { waitIfBusy: false }]) {
      const result = await layoutApi.applyLayout('net1', options)
      expect(!result.success && result.error.code).toBe(
        AppCodes.LAYOUT_ALREADY_RUNNING.code,
      )
    }
  })

  // window.CyWebApi takes options from any caller, so the type is checked
  // at runtime: a truthy string must not be read as `true`.
  it('rejects a waitIfBusy that is not a boolean with INVALID_INPUT', async () => {
    const result = await layoutApi.applyLayout('net1', {
      waitIfBusy: 'yes' as unknown as boolean,
    })

    expect(!result.success && result.error.code).toBe(
      AppCodes.INVALID_INPUT.code,
    )
    expect(mockLayoutEngines[0].apply).not.toHaveBeenCalled()
  })
})
