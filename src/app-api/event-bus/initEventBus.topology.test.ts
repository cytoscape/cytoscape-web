// src/app-api/event-bus/initEventBus.topology.test.ts
// Integration test for network:changed against the REAL NetworkStore.
//
// initEventBus.test.ts mocks every store and invokes the subscription callback
// by hand with distinct plain objects, so it never exercises the path that
// actually happens in the app: CW networks are cytoscape-backed and mutate in
// place, so the store re-sets the very same Network reference. This file drives
// the real store actions and asserts the event still fires.

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import NetworkFn from '../../models/NetworkModel'
import { initEventBus } from './initEventBus'

vi.mock('../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/db')>()
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
  }
})

// The other four stores are irrelevant here — stub their subscriptions so
// initEventBus() can wire itself up without pulling them in. Each factory is
// hoisted above the module body, so the stub is built inline in every one.
vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ workspace: { networkIds: [], currentNetworkId: '' } }),
    subscribe: () => () => {},
  },
}))
vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: () => ({ viewModels: {} }),
    subscribe: () => () => {},
  },
}))
vi.mock('../../data/hooks/stores/VisualStyleStore', () => ({
  useVisualStyleStore: {
    getState: () => ({ visualStyles: {} }),
    subscribe: () => () => {},
  },
}))
vi.mock('../../data/hooks/stores/TableStore', () => ({
  useTableStore: {
    getState: () => ({ tables: {} }),
    subscribe: () => () => {},
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

let dispatchSpy: import('vitest').MockInstance

/** Details of every network:changed event dispatched so far */
function changedDetails(): any[] {
  return (dispatchSpy.mock.calls as Array<[Event]>)
    .map((args) => args[0] as CustomEvent)
    .filter((event) => event.type === 'network:changed')
    .map((event) => event.detail)
}

const addNetwork = (id: string): void => {
  useNetworkStore
    .getState()
    .add(
      NetworkFn.createNetworkFromLists(
        id,
        [{ id: 'n1' }, { id: 'n2' }],
        [{ id: 'e1', s: 'n1', t: 'n2' }],
      ),
    )
}

// initEventBus() has no teardown, so it is wired exactly once for the whole
// file and each test works on its own network id.
beforeAll(() => {
  // A network already in the store when the bus starts — the hydrated case
  addNetwork('hydrated')
  initEventBus()
})

beforeEach(() => {
  dispatchSpy = vi.spyOn(window, 'dispatchEvent')
  dispatchSpy.mockClear()
})

describe('network:changed with in-place (cy-backed) mutations', () => {
  it('fires when a node is added to a network present before init', () => {
    useNetworkStore.getState().addNode('hydrated', 'n3')

    expect(changedDetails()).toEqual([
      {
        networkId: 'hydrated',
        addedNodeIds: ['n3'],
        removedNodeIds: [],
        addedEdgeIds: [],
        removedEdgeIds: [],
      },
    ])
  })

  it('fires when a node is added to a network registered after init', () => {
    addNetwork('net1')
    useNetworkStore.getState().addNode('net1', 'n3')

    expect(changedDetails()).toEqual([
      {
        networkId: 'net1',
        addedNodeIds: ['n3'],
        removedNodeIds: [],
        addedEdgeIds: [],
        removedEdgeIds: [],
      },
    ])
  })

  it('does not fire when a network is merely registered', () => {
    addNetwork('net2')

    expect(changedDetails()).toEqual([])
  })

  it('reports added nodes and edges together', () => {
    addNetwork('net3')
    useNetworkStore
      .getState()
      .addNodesAndEdges('net3', ['n3'], [{ id: 'e2', s: 'n2', t: 'n3' }])

    expect(changedDetails()).toEqual([
      {
        networkId: 'net3',
        addedNodeIds: ['n3'],
        removedNodeIds: [],
        addedEdgeIds: ['e2'],
        removedEdgeIds: [],
      },
    ])
  })

  it('reports a removed node together with its cascaded edges', () => {
    addNetwork('net4')
    useNetworkStore.getState().deleteNodes('net4', ['n2'])

    expect(changedDetails()).toEqual([
      {
        networkId: 'net4',
        addedNodeIds: [],
        removedNodeIds: ['n2'],
        addedEdgeIds: [],
        removedEdgeIds: ['e1'],
      },
    ])
  })

  it('reports a removed edge', () => {
    addNetwork('net5')
    useNetworkStore.getState().deleteEdges('net5', ['e1'])

    expect(changedDetails()).toEqual([
      {
        networkId: 'net5',
        addedNodeIds: [],
        removedNodeIds: [],
        addedEdgeIds: [],
        removedEdgeIds: ['e1'],
      },
    ])
  })

  it('reports an added edge', () => {
    addNetwork('net6')
    useNetworkStore.getState().addEdge('net6', 'e2', 'n2', 'n1')

    expect(changedDetails()).toEqual([
      {
        networkId: 'net6',
        addedNodeIds: [],
        removedNodeIds: [],
        addedEdgeIds: ['e2'],
        removedEdgeIds: [],
      },
    ])
  })

  it('does not fire for moveEdge, which leaves membership unchanged', () => {
    addNetwork('net7')
    useNetworkStore.getState().moveEdge('net7', 'e1', 'n2', 'n1')

    expect(changedDetails()).toEqual([])
  })

  it('reports only the mutated network when several are registered', () => {
    addNetwork('net8')
    addNetwork('net9')
    useNetworkStore.getState().addNode('net9', 'n3')

    expect(changedDetails().map((d) => d.networkId)).toEqual(['net9'])
  })
})

// ── Reentrancy ────────────────────────────────────────────────────────────────

describe('network:changed under a reentrant listener', () => {
  // Store subscribers and window event listeners both run synchronously, so a
  // listener that mutates the network store re-enters the subscription from
  // inside the dispatch. The bus must finish its own bookkeeping before
  // handing control to listeners, or the outer invocation clobbers what the
  // nested one recorded.

  it('keeps the snapshot of a network created from inside a listener', () => {
    // The listener adds 'nested' while the bus is dispatching for 'outer'
    let added = false
    const listener = (): void => {
      if (added) return
      added = true
      addNetwork('nested')
    }
    window.addEventListener('network:changed', listener)
    addNetwork('outer')

    try {
      useNetworkStore.getState().addNode('outer', 'n3')
    } finally {
      window.removeEventListener('network:changed', listener)
    }

    expect(added).toBe(true)
    dispatchSpy.mockClear()

    // 'nested' was registered while the bus was mid-dispatch. Its snapshot must
    // have survived, so this change is a change — not a first sighting.
    useNetworkStore.getState().addNode('nested', 'n3')

    expect(changedDetails()).toEqual([
      {
        networkId: 'nested',
        addedNodeIds: ['n3'],
        removedNodeIds: [],
        addedEdgeIds: [],
        removedEdgeIds: [],
      },
    ])
  })

  it('drops the snapshot of a network deleted from inside a listener', () => {
    // Mirror case: a snapshot retained past its network's deletion would be
    // diffed against a later network that reuses the id, dispatching a
    // spurious change for what is really a creation.
    addNetwork('doomed')
    addNetwork('trigger')

    let deleted = false
    const listener = (): void => {
      if (deleted) return
      deleted = true
      useNetworkStore.getState().delete('doomed')
    }
    window.addEventListener('network:changed', listener)

    try {
      useNetworkStore.getState().addNode('trigger', 'n3')
    } finally {
      window.removeEventListener('network:changed', listener)
    }

    expect(deleted).toBe(true)
    dispatchSpy.mockClear()

    // Same id, different topology than the network that was deleted
    useNetworkStore
      .getState()
      .add(NetworkFn.createNetworkFromLists('doomed', [{ id: 'z1' }], []))

    expect(changedDetails()).toEqual([])
  })
})
