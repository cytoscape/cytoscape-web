// src/app-api/event-bus/initEventBus.test.ts
// Plain Jest tests — no renderHook. Mock store subscriptions and assert
// that window.dispatchEvent is called with the correct CustomEvent payloads.

import { initEventBus } from './initEventBus'

// ── Mock: dispatchCyWebEvent (verify via window.dispatchEvent spy) ─────────────
// We let the real dispatchCyWebEvent run; we spy on window.dispatchEvent.

// ── Mock: WorkspaceStore ──────────────────────────────────────────────────────

type SubscriptionCallback = (curr: any, prev: any) => void

const workspaceSubs: Array<{ selector: (s: any) => any; callback: SubscriptionCallback }> = []

const mockWorkspaceState = {
  workspace: {
    networkIds: [] as string[],
    currentNetworkId: '',
  },
}

jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => mockWorkspaceState),
    subscribe: jest.fn((selectorOrCb: any, cb?: any) => {
      if (typeof cb === 'function') {
        workspaceSubs.push({ selector: selectorOrCb, callback: cb })
      }
      return () => {}
    }),
  },
}))

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const viewModelSubs: Array<{ selector: (s: any) => any; callback: SubscriptionCallback; options?: any }> = []

jest.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: jest.fn(),
    subscribe: jest.fn((selectorOrCb: any, cb?: any, opts?: any) => {
      if (typeof cb === 'function') {
        viewModelSubs.push({ selector: selectorOrCb, callback: cb, options: opts })
      }
      return () => {}
    }),
  },
}))

// ── Mock: VisualStyleStore ────────────────────────────────────────────────────

const visualStyleSubs: Array<SubscriptionCallback> = []

jest.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: jest.fn(),
    subscribe: jest.fn((cb: any) => {
      visualStyleSubs.push(cb)
      return () => {}
    }),
  },
}))

// ── Mock: TableStore ──────────────────────────────────────────────────────────

const tableSubs: Array<{ selector: (s: any) => any; callback: SubscriptionCallback }> = []

jest.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: jest.fn(),
    subscribe: jest.fn((selectorOrCb: any, cb?: any) => {
      if (typeof cb === 'function') {
        tableSubs.push({ selector: selectorOrCb, callback: cb })
      }
      return () => {}
    }),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerWorkspaceSub(index: number, curr: any, prev: any): void {
  workspaceSubs[index].callback(curr, prev)
}

function triggerViewModelSub(curr: any, prev: any): void {
  const { callback, options } = viewModelSubs[0]
  // Simulate subscribeWithSelector: skip callback when equalityFn returns true
  if (options?.equalityFn !== undefined && options.equalityFn(curr, prev)) return
  callback(curr, prev)
}

function triggerVisualStyleSub(curr: any, prev: any): void {
  visualStyleSubs[0](curr, prev)
}

function triggerTableSub(curr: any, prev: any): void {
  tableSubs[0].callback(curr, prev)
}

function dispatchedTypes(): string[] {
  const spy = jest.spyOn(window, 'dispatchEvent') as jest.SpyInstance
  return (spy.mock.calls as Array<[Event]>).map((args) => (args[0] as CustomEvent).type)
}

function dispatchedDetails(): any[] {
  const spy = jest.spyOn(window, 'dispatchEvent') as jest.SpyInstance
  return (spy.mock.calls as Array<[Event]>).map((args) => (args[0] as CustomEvent).detail)
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let dispatchSpy: jest.SpyInstance

beforeEach(() => {
  workspaceSubs.length = 0
  viewModelSubs.length = 0
  visualStyleSubs.length = 0
  tableSubs.length = 0
  dispatchSpy = jest.spyOn(window, 'dispatchEvent')
  initEventBus()
})

afterEach(() => {
  dispatchSpy.mockRestore()
})

// ── network:created ───────────────────────────────────────────────────────────

describe('network:created', () => {
  it('dispatches one event when a single network is added', () => {
    triggerWorkspaceSub(0, ['net1'], [])

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('network:created')
    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1' })
  })

  it('dispatches one event per added network on bulk add', () => {
    triggerWorkspaceSub(0, ['net1', 'net2'], [])

    const types = dispatchedTypes()
    expect(types.filter((t) => t === 'network:created')).toHaveLength(2)
    const details = dispatchedDetails()
    const ids = details.map((d) => d.networkId)
    expect(ids).toContain('net1')
    expect(ids).toContain('net2')
  })

  it('does not dispatch on startup (startup suppression)', () => {
    // Subscriptions are set up; state has not changed yet → no event fired
    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})

// ── network:deleted ───────────────────────────────────────────────────────────

describe('network:deleted', () => {
  it('dispatches one event when a single network is removed', () => {
    triggerWorkspaceSub(0, [], ['net1'])

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('network:deleted')
    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1' })
  })

  it('dispatches one event per removed network on bulk delete', () => {
    triggerWorkspaceSub(0, [], ['net1', 'net2'])

    const types = dispatchedTypes()
    expect(types.filter((t) => t === 'network:deleted')).toHaveLength(2)
  })
})

// ── network:switched ──────────────────────────────────────────────────────────

describe('network:switched', () => {
  it('dispatches when currentNetworkId changes', () => {
    triggerWorkspaceSub(1, 'net2', 'net1')

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('network:switched')
    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net2', previousId: 'net1' })
  })

  it('does not dispatch when currentNetworkId is unchanged', () => {
    triggerWorkspaceSub(1, 'net1', 'net1')

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('uses previousId="" when no network was active before', () => {
    triggerWorkspaceSub(1, 'net1', '')

    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1', previousId: '' })
  })
})

// ── selection:changed ─────────────────────────────────────────────────────────

describe('selection:changed', () => {
  it('dispatches when selectedNodes changes', () => {
    const detail = { networkId: 'net1', selectedNodes: ['n1'], selectedEdges: [] }
    triggerViewModelSub(detail, { networkId: 'net1', selectedNodes: [], selectedEdges: [] })

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('selection:changed')
    expect(dispatchedDetails()[0]).toEqual(detail)
  })

  it('dispatches when selectedEdges changes', () => {
    const detail = { networkId: 'net1', selectedNodes: [], selectedEdges: ['e1'] }
    triggerViewModelSub(detail, { networkId: 'net1', selectedNodes: [], selectedEdges: [] })

    expect(dispatchedDetails()[0]).toEqual(detail)
  })

  it('does not dispatch when same node is re-clicked (new array, identical contents)', () => {
    // Simulates the store creating a new array object with the same node ID.
    // shallowEqual would fire here; selectionEqual must suppress it.
    const curr = { networkId: 'net1', selectedNodes: ['n1'], selectedEdges: [] }
    const prev = { networkId: 'net1', selectedNodes: ['n1'], selectedEdges: [] }
    triggerViewModelSub(curr, prev)

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch when selection is unchanged (empty → empty)', () => {
    const curr = { networkId: 'net1', selectedNodes: [], selectedEdges: [] }
    const prev = { networkId: 'net1', selectedNodes: [], selectedEdges: [] }
    triggerViewModelSub(curr, prev)

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})

// ── style:changed ─────────────────────────────────────────────────────────────

describe('style:changed', () => {
  it('dispatches when a single property changes', () => {
    const prevStyle = { NODE_BACKGROUND_COLOR: { value: '#fff' } }
    const currStyle = { NODE_BACKGROUND_COLOR: { value: '#000' } }
    triggerVisualStyleSub(
      { visualStyles: { net1: currStyle } },
      { visualStyles: { net1: prevStyle } },
    )

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('style:changed')
    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1', property: 'NODE_BACKGROUND_COLOR' })
  })

  it('dispatches one event per changed property', () => {
    const prevStyle = { NODE_BACKGROUND_COLOR: { value: '#fff' }, EDGE_WIDTH: { value: 1 } }
    const currStyle = { NODE_BACKGROUND_COLOR: { value: '#000' }, EDGE_WIDTH: { value: 2 } }
    triggerVisualStyleSub(
      { visualStyles: { net1: currStyle } },
      { visualStyles: { net1: prevStyle } },
    )

    expect(dispatchSpy).toHaveBeenCalledTimes(2)
  })

  it('does not dispatch when style reference is unchanged', () => {
    const style = { NODE_BACKGROUND_COLOR: { value: '#fff' } }
    triggerVisualStyleSub(
      { visualStyles: { net1: style } },
      { visualStyles: { net1: style } },
    )

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})

// ── data:changed ──────────────────────────────────────────────────────────────

describe('data:changed', () => {
  it('dispatches when a single row changes in node table', () => {
    const sharedRow = { name: 'A' }
    const changedRow = { name: 'B' }
    const prevTable = { nodeTable: { id: 't1', columns: [], rows: new Map([['n1', sharedRow]]) }, edgeTable: { id: 't2', columns: [], rows: new Map() } }
    const currTable = { nodeTable: { id: 't1', columns: [], rows: new Map([['n1', changedRow]]) }, edgeTable: prevTable.edgeTable }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('data:changed')
    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1', tableType: 'node', rowIds: ['n1'] })
  })

  it('dispatches with rowIds=[] for schema-only change (column added)', () => {
    const rows = new Map([['n1', { name: 'A' }]])
    const prevTable = { nodeTable: { id: 't1', columns: [], rows }, edgeTable: { id: 't2', columns: [], rows: new Map() } }
    const currTable = { nodeTable: { id: 't1', columns: [{ name: 'newCol' }], rows }, edgeTable: prevTable.edgeTable }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchedDetails()[0]).toEqual({ networkId: 'net1', tableType: 'node', rowIds: [] })
  })

  it('includes all changed row IDs on bulk change', () => {
    const prevRows = new Map([['n1', { v: 1 }], ['n2', { v: 2 }]])
    const currRows = new Map([['n1', { v: 9 }], ['n2', { v: 9 }]])
    const prevTable = { nodeTable: { id: 't1', columns: [], rows: prevRows }, edgeTable: { id: 't2', columns: [], rows: new Map() } }
    const currTable = { nodeTable: { id: 't1', columns: [], rows: currRows }, edgeTable: prevTable.edgeTable }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    const rowIds = dispatchedDetails()[0].rowIds as string[]
    expect(rowIds).toContain('n1')
    expect(rowIds).toContain('n2')
    expect(rowIds).toHaveLength(2)
  })

  it('does not dispatch when table reference is unchanged', () => {
    const table = { nodeTable: { id: 't1', columns: [], rows: new Map() }, edgeTable: { id: 't2', columns: [], rows: new Map() } }
    triggerTableSub({ net1: table }, { net1: table })

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
