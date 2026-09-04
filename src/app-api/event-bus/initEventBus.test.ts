import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/event-bus/initEventBus.test.ts
// Plain Jest tests — no renderHook. Mock store subscriptions and assert
// that window.dispatchEvent is called with the correct CustomEvent payloads.
import { initEventBus } from './initEventBus'

// ── Mock: dispatchCyWebEvent (verify via window.dispatchEvent spy) ─────────────
// We let the real dispatchCyWebEvent run; we spy on window.dispatchEvent.

// ── Mock: WorkspaceStore ──────────────────────────────────────────────────────

type SubscriptionCallback = (curr: any, prev: any) => void

const workspaceSubs: Array<{
  selector: (s: any) => any
  callback: SubscriptionCallback
}> = []

const mockWorkspaceState = {
  workspace: {
    networkIds: [] as string[],
    currentNetworkId: '',
  },
}

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => mockWorkspaceState),
    subscribe: vi.fn((selectorOrCb: any, cb?: any) => {
      if (typeof cb === 'function') {
        workspaceSubs.push({ selector: selectorOrCb, callback: cb })
      }
      return () => {}
    }),
  },
}))

// ── Mock: ViewModelStore ──────────────────────────────────────────────────────

const viewModelSubs: Array<{
  selector: (s: any) => any
  callback: SubscriptionCallback
  options?: any
}> = []

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: vi.fn(),
    subscribe: vi.fn((selectorOrCb: any, cb?: any, opts?: any) => {
      if (typeof cb === 'function') {
        viewModelSubs.push({
          selector: selectorOrCb,
          callback: cb,
          options: opts,
        })
      }
      return () => {}
    }),
  },
}))

// ── Mock: VisualStyleStore ────────────────────────────────────────────────────

const visualStyleSubs: Array<SubscriptionCallback> = []

vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: vi.fn(),
    subscribe: vi.fn((cb: any) => {
      visualStyleSubs.push(cb)
      return () => {}
    }),
  },
}))

// ── Mock: TableStore ──────────────────────────────────────────────────────────

const tableSubs: Array<{
  selector: (s: any) => any
  callback: SubscriptionCallback
}> = []

vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: vi.fn(),
    subscribe: vi.fn((selectorOrCb: any, cb?: any) => {
      if (typeof cb === 'function') {
        tableSubs.push({ selector: selectorOrCb, callback: cb })
      }
      return () => {}
    }),
  },
}))

// ── Mock: NetworkStore ────────────────────────────────────────────────────────

const networkSubs: Array<{
  selector: (s: any) => any
  callback: SubscriptionCallback
}> = []

// The network:changed subscription reads the live networks Map out of the
// store (topology mutations happen in place, so the subscription payload is
// only a version counter). Tests drive this Map directly.
const { mockNetworks } = vi.hoisted(() => ({
  mockNetworks: new Map<string, any>(),
}))

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({ networks: mockNetworks })),
    subscribe: vi.fn((selectorOrCb: any, cb?: any) => {
      if (typeof cb === 'function') {
        networkSubs.push({ selector: selectorOrCb, callback: cb })
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
  if (options?.equalityFn !== undefined && options.equalityFn(curr, prev))
    return
  callback(curr, prev)
}

/**
 * The VisualStyleStore subscription reads two slices — `styleSets` for
 * style:switched and `visualStyles` for style:changed. Fixtures name only
 * the one under test, so the other defaults to empty.
 */
function triggerVisualStyleSub(curr: any, prev: any): void {
  visualStyleSubs[0](
    { styleSets: {}, visualStyles: {}, ...curr },
    { styleSets: {}, visualStyles: {}, ...prev },
  )
}

function triggerTableSub(curr: any, prev: any): void {
  tableSubs[0].callback(curr, prev)
}

function triggerNetworkSub(curr: any, prev: any): void {
  networkSubs[0].callback(curr, prev)
}

function dispatchedTypes(): string[] {
  const spy = vi.spyOn(window, 'dispatchEvent') as import('vitest').MockInstance
  return (spy.mock.calls as Array<[Event]>).map(
    (args) => (args[0] as CustomEvent).type,
  )
}

function dispatchedDetails(): any[] {
  const spy = vi.spyOn(window, 'dispatchEvent') as import('vitest').MockInstance
  return (spy.mock.calls as Array<[Event]>).map(
    (args) => (args[0] as CustomEvent).detail,
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let dispatchSpy: import('vitest').MockInstance

beforeEach(() => {
  workspaceSubs.length = 0
  viewModelSubs.length = 0
  visualStyleSubs.length = 0
  tableSubs.length = 0
  networkSubs.length = 0
  mockNetworks.clear()
  dispatchSpy = vi.spyOn(window, 'dispatchEvent')
  initEventBus()
})

afterEach(() => {
  dispatchSpy.mockRestore()
})

// ── network:changed ───────────────────────────────────────────────────────────

describe('network:changed', () => {
  const net = (nodes: string[], edges: Array<[string, string, string]>) => ({
    id: 'net1',
    nodes: nodes.map((id) => ({ id })),
    edges: edges.map(([id, s, t]) => ({ id, s, t })),
  })

  /**
   * Puts a network in the store and lets the bus snapshot it, the way
   * NetworkStore.add() does. Networks mutate in place, so the subscription
   * carries only the bumped version — the membership is read from the store.
   */
  const registerNetwork = (
    nodes: string[],
    edges: Array<[string, string, string]> = [],
  ): void => {
    mockNetworks.set('net1', net(nodes, edges))
    triggerNetworkSub(new Map([['net1', 1]]), new Map())
  }

  /** Mutates the network in place and bumps its topology version */
  const mutateNetwork = (
    nodes: string[],
    edges: Array<[string, string, string]> = [],
  ): void => {
    const network = mockNetworks.get('net1')
    network.nodes = nodes.map((id) => ({ id }))
    network.edges = edges.map(([id, s, t]) => ({ id, s, t }))
    triggerNetworkSub(new Map([['net1', 2]]), new Map([['net1', 1]]))
  }

  it('reports added nodes', () => {
    registerNetwork(['n1'])
    dispatchSpy.mockClear()

    mutateNetwork(['n1', 'n2'])

    expect(dispatchedTypes()).toContain('network:changed')
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      addedNodeIds: ['n2'],
      removedNodeIds: [],
      addedEdgeIds: [],
      removedEdgeIds: [],
    })
  })

  it('reports removed nodes and their cascaded edges', () => {
    registerNetwork(['n1', 'n2'], [['e0', 'n1', 'n2']])
    dispatchSpy.mockClear()

    mutateNetwork(['n1'])

    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      addedNodeIds: [],
      removedNodeIds: ['n2'],
      addedEdgeIds: [],
      removedEdgeIds: ['e0'],
    })
  })

  it('does not dispatch for a newly created network (network:created covers it)', () => {
    registerNetwork(['n1'])

    expect(dispatchedTypes()).not.toContain('network:changed')
  })

  it('does not dispatch when membership did not change', () => {
    registerNetwork(['n1'])
    dispatchSpy.mockClear()

    mutateNetwork(['n1'])

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch when the topology version is unchanged', () => {
    registerNetwork(['n1'])
    dispatchSpy.mockClear()
    mockNetworks.get('net1').nodes = [{ id: 'n1' }, { id: 'n2' }]

    triggerNetworkSub(new Map([['net1', 1]]), new Map([['net1', 1]]))

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
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
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net2',
      previousId: 'net1',
    })
  })

  it('does not dispatch when currentNetworkId is unchanged', () => {
    triggerWorkspaceSub(1, 'net1', 'net1')

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('uses previousId="" when no network was active before', () => {
    triggerWorkspaceSub(1, 'net1', '')

    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      previousId: '',
    })
  })
})

// ── selection:changed ─────────────────────────────────────────────────────────

describe('selection:changed', () => {
  it('dispatches when selectedNodes changes', () => {
    const detail = {
      networkId: 'net1',
      selectedNodes: ['n1'],
      selectedEdges: [],
    }
    triggerViewModelSub(detail, {
      networkId: 'net1',
      selectedNodes: [],
      selectedEdges: [],
    })

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('selection:changed')
    expect(dispatchedDetails()[0]).toEqual(detail)
  })

  it('dispatches when selectedEdges changes', () => {
    const detail = {
      networkId: 'net1',
      selectedNodes: [],
      selectedEdges: ['e1'],
    }
    triggerViewModelSub(detail, {
      networkId: 'net1',
      selectedNodes: [],
      selectedEdges: [],
    })

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

// ── style:switched ────────────────────────────────────────────────────────────

describe('style:switched', () => {
  it('dispatches when the active style of a network changes', () => {
    triggerVisualStyleSub(
      { styleSets: { net1: { activeStyleId: 's2', styles: {} } } },
      { styleSets: { net1: { activeStyleId: 's1', styles: {} } } },
    )

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toEqual(['style:switched'])
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      styleId: 's2',
      previousStyleId: 's1',
    })
  })

  it('does not dispatch when the active style is unchanged', () => {
    triggerVisualStyleSub(
      { styleSets: { net1: { activeStyleId: 's1', styles: {} } } },
      { styleSets: { net1: { activeStyleId: 's1', styles: {} } } },
    )

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch for a newly registered network (network:created covers it)', () => {
    triggerVisualStyleSub(
      { styleSets: { net1: { activeStyleId: 's1', styles: {} } } },
      { styleSets: {} },
    )

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('arrives before the style:changed burst the switch causes', () => {
    // A switch replaces the whole working copy, so every differing property
    // also fires style:changed. The coarse event has to come first, or an app
    // handling the burst cannot tell it apart from N separate property edits.
    triggerVisualStyleSub(
      {
        styleSets: { net1: { activeStyleId: 's2', styles: {} } },
        visualStyles: {
          net1: {
            NODE_BACKGROUND_COLOR: { value: '#000' },
            EDGE_WIDTH: { value: 2 },
          },
        },
      },
      {
        styleSets: { net1: { activeStyleId: 's1', styles: {} } },
        visualStyles: {
          net1: {
            NODE_BACKGROUND_COLOR: { value: '#fff' },
            EDGE_WIDTH: { value: 1 },
          },
        },
      },
    )

    expect(dispatchedTypes()).toEqual([
      'style:switched',
      'style:changed',
      'style:changed',
    ])
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
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      property: 'NODE_BACKGROUND_COLOR',
    })
  })

  it('dispatches one event per changed property', () => {
    const prevStyle = {
      NODE_BACKGROUND_COLOR: { value: '#fff' },
      EDGE_WIDTH: { value: 1 },
    }
    const currStyle = {
      NODE_BACKGROUND_COLOR: { value: '#000' },
      EDGE_WIDTH: { value: 2 },
    }
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

  it('does not dispatch for a newly created network style (network:created covers it)', () => {
    // Regression: adding a style for a brand-new network must not fire one
    // style:changed per visual property — mirrors the new-network guards in
    // network:changed and data:changed.
    const newStyle = {
      NODE_BACKGROUND_COLOR: { value: '#fff' },
      EDGE_WIDTH: { value: 1 },
      NODE_LABEL: { value: '' },
    }
    triggerVisualStyleSub(
      { visualStyles: { net1: newStyle } },
      { visualStyles: {} },
    )

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('still dispatches for an existing network when another network is new', () => {
    const prevStyle = { NODE_BACKGROUND_COLOR: { value: '#fff' } }
    const currStyle = { NODE_BACKGROUND_COLOR: { value: '#000' } }
    const newStyle = { NODE_BACKGROUND_COLOR: { value: '#abc' } }
    triggerVisualStyleSub(
      { visualStyles: { net1: currStyle, net2: newStyle } },
      { visualStyles: { net1: prevStyle } },
    )

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      property: 'NODE_BACKGROUND_COLOR',
    })
  })
})

// ── data:changed ──────────────────────────────────────────────────────────────

describe('data:changed', () => {
  it('dispatches when a single row changes in node table', () => {
    const sharedRow = { name: 'A' }
    const changedRow = { name: 'B' }
    const prevTable = {
      nodeTable: { id: 't1', columns: [], rows: new Map([['n1', sharedRow]]) },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    const currTable = {
      nodeTable: { id: 't1', columns: [], rows: new Map([['n1', changedRow]]) },
      edgeTable: prevTable.edgeTable,
    }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchedTypes()).toContain('data:changed')
    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      tableType: 'node',
      rowIds: ['n1'],
      addedColumns: [],
      removedColumns: [],
    })
  })

  it('reports added columns for schema-only change', () => {
    const rows = new Map([['n1', { name: 'A' }]])
    const prevTable = {
      nodeTable: { id: 't1', columns: [], rows },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    const currTable = {
      nodeTable: { id: 't1', columns: [{ name: 'newCol' }], rows },
      edgeTable: prevTable.edgeTable,
    }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchedDetails()[0]).toEqual({
      networkId: 'net1',
      tableType: 'node',
      rowIds: [],
      addedColumns: ['newCol'],
      removedColumns: [],
    })
  })

  it('reports removed columns when a column is deleted', () => {
    const rows = new Map([['n1', { name: 'A' }]])
    const prevTable = {
      nodeTable: {
        id: 't1',
        columns: [{ name: 'name' }, { name: 'score' }],
        rows,
      },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    const currTable = {
      nodeTable: { id: 't1', columns: [{ name: 'name' }], rows },
      edgeTable: prevTable.edgeTable,
    }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchedDetails()[0].addedColumns).toEqual([])
    expect(dispatchedDetails()[0].removedColumns).toEqual(['score'])
  })

  it('reports a rename as one added and one removed column', () => {
    const rows = new Map([['n1', { oldName: 'A' }]])
    const prevTable = {
      nodeTable: { id: 't1', columns: [{ name: 'oldName' }], rows },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    const currTable = {
      nodeTable: { id: 't1', columns: [{ name: 'newName' }], rows },
      edgeTable: prevTable.edgeTable,
    }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    expect(dispatchedDetails()[0].addedColumns).toEqual(['newName'])
    expect(dispatchedDetails()[0].removedColumns).toEqual(['oldName'])
  })

  it('includes all changed row IDs on bulk change', () => {
    const prevRows = new Map([
      ['n1', { v: 1 }],
      ['n2', { v: 2 }],
    ])
    const currRows = new Map([
      ['n1', { v: 9 }],
      ['n2', { v: 9 }],
    ])
    const prevTable = {
      nodeTable: { id: 't1', columns: [], rows: prevRows },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    const currTable = {
      nodeTable: { id: 't1', columns: [], rows: currRows },
      edgeTable: prevTable.edgeTable,
    }

    triggerTableSub({ net1: currTable }, { net1: prevTable })

    const rowIds = dispatchedDetails()[0].rowIds as string[]
    expect(rowIds).toContain('n1')
    expect(rowIds).toContain('n2')
    expect(rowIds).toHaveLength(2)
  })

  it('does not dispatch when table reference is unchanged', () => {
    const table = {
      nodeTable: { id: 't1', columns: [], rows: new Map() },
      edgeTable: { id: 't2', columns: [], rows: new Map() },
    }
    triggerTableSub({ net1: table }, { net1: table })

    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
