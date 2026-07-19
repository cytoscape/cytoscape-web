import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/scopedApi.test.ts
// Verifies forNetwork() pre-binds networkId and resolves the current
// network at call time when unbound.

import { forNetwork } from './scopedApi'

// ── Mock the underlying domain objects ───────────────────────────────────────
// Each method just echoes its arguments so we can assert on the injected id.
// The echo helper is inlined per factory because vi.mock is hoisted above
// module-level declarations.

vi.mock('./elementApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { elementApi: { createNode: echo('createNode'), getNode: echo('getNode') } }
})
vi.mock('./tableApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { tableApi: { getTable: echo('getTable') } }
})
vi.mock('./selectionApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { selectionApi: { exclusiveSelect: echo('exclusiveSelect') } }
})
vi.mock('./viewportApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { viewportApi: { fit: echo('fit') } }
})
vi.mock('./visualStyleApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { visualStyleApi: { setDefault: echo('setDefault') } }
})
vi.mock('./exportApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { exportApi: { exportToCx2: echo('exportToCx2') } }
})
vi.mock('./layoutApi', () => {
  const echo = (name: string) => (...args: any[]) => ({ name, args })
  return { layoutApi: { applyLayout: echo('applyLayout'), getAvailableLayouts: echo('getAvailableLayouts') } }
})

// ── Mock WorkspaceStore for current-network resolution ───────────────────────

const mockWorkspace = { currentNetworkId: 'current-net' }

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ workspace: mockWorkspace })),
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockWorkspace.currentNetworkId = 'current-net'
})

describe('forNetwork', () => {
  it('binds a specific networkId as the first argument on every domain', () => {
    const net = forNetwork('net-42')

    expect(net.element.createNode([10, 20] as any)).toEqual({
      name: 'createNode',
      args: ['net-42', [10, 20]],
    })
    expect(net.table.getTable('node' as any)).toEqual({
      name: 'getTable',
      args: ['net-42', 'node'],
    })
    expect(net.selection.exclusiveSelect(['n1'], [])).toEqual({
      name: 'exclusiveSelect',
      args: ['net-42', ['n1'], []],
    })
    expect(net.viewport.fit()).toEqual({ name: 'fit', args: ['net-42'] })
    expect(net.visualStyle.setDefault('NODE_LABEL' as any, 'x' as any)).toEqual({
      name: 'setDefault',
      args: ['net-42', 'NODE_LABEL', 'x'],
    })
    expect(net.export.exportToCx2()).toEqual({
      name: 'exportToCx2',
      args: ['net-42'],
    })
    expect(net.layout.applyLayout({ algorithmName: 'circle' } as any)).toEqual({
      name: 'applyLayout',
      args: ['net-42', { algorithmName: 'circle' }],
    })
  })

  it('resolves the current network at call time when unbound', () => {
    const net = forNetwork()

    expect(net.element.getNode('n1' as any)).toEqual({
      name: 'getNode',
      args: ['current-net', 'n1'],
    })

    // Switching the current network is reflected on the next call
    mockWorkspace.currentNetworkId = 'other-net'
    expect(net.element.getNode('n2' as any)).toEqual({
      name: 'getNode',
      args: ['other-net', 'n2'],
    })
  })

  it('exposes only the network-scoped domains', () => {
    const net = forNetwork('net-1')
    expect(Object.keys(net).sort()).toEqual([
      'element',
      'export',
      'layout',
      'selection',
      'table',
      'viewport',
      'visualStyle',
    ])
    // Only applyLayout is bound on the scoped layout domain
    expect(Object.keys(net.layout)).toEqual(['applyLayout'])
  })

  it('scoped method types drop the networkId parameter (compile-time)', () => {
    const net = forNetwork('net-1')
    // These lines only type-check if `networkId` was stripped: the scoped
    // signatures must accept the remaining args with no leading id. A
    // regression in the OmitFirstArg mapped type would fail `tsc`.
    type FirstArg<F> = F extends (a: infer A, ...rest: any[]) => any ? A : never
    const _elementFirstArg: FirstArg<typeof net.element.getNode> = 'n1'
    const _tableFirstArg: FirstArg<typeof net.table.getTable> = 'node' as any
    expect(_elementFirstArg).toBe('n1')
    expect(_tableFirstArg).toBe('node')
  })
})
