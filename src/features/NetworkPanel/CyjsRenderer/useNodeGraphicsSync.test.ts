import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNodeGraphicsStore } from '../../../data/hooks/stores/NodeGraphicsStore'
import type { IdType } from '../../../models/IdType'
import type { NodeGraphicsRenderHook } from '../../../models/StoreModel/NodeGraphicsStoreModel'
import type { Table } from '../../../models/TableModel'
import type { ValueType } from '../../../models/TableModel'
import { useNodeGraphicsSync } from './useNodeGraphicsSync'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// A real (minimal) zustand store for tables, so the hook's selector subscription
// re-renders exactly as it does in the app. ViewModelStore and hydrationContext
// only need getState-level stubs.

vi.mock('../../../data/hooks/stores/TableStore', async () => {
  const { create } = await import('zustand')
  return {
    useTableStore: create<{ tables: Record<string, { nodeTable: Table }> }>(
      () => ({ tables: {} }),
    ),
  }
})

const mockGetViewModel = vi.fn(() => undefined)
vi.mock('../../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: {
    getState: () => ({ getViewModel: mockGetViewModel }),
  },
}))

const mockIsHydrating = vi.fn(() => false)
vi.mock('../../../data/hooks/stores/hydrationContext', () => ({
  isHydrating: () => mockIsHydrating(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const COALESCE_MS = 50

const tableOf = (rows: Array<[IdType, Record<string, ValueType>]>): Table =>
  ({ id: 't', columns: [], rows: new Map(rows) }) as unknown as Table

/** Replace a network's node table, mimicking a TableStore write. */
const setNodeTable = async (networkId: string, table: Table): Promise<void> => {
  const { useTableStore } = await import(
    '../../../data/hooks/stores/TableStore'
  )
  ;(useTableStore as any).setState({
    tables: {
      ...(useTableStore as any).getState().tables,
      [networkId]: { nodeTable: table },
    },
  })
}

/** Run the coalescing timer plus enough animation frames to drain all chunks. */
const drain = async (frames = 5): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(COALESCE_MS + 1)
  })
  for (let i = 0; i < frames; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
  }
}

const registerHook = (
  render: NodeGraphicsRenderHook,
  appId = 'app-a',
): void => {
  act(() => {
    useNodeGraphicsStore
      .getState()
      .setHook({ hookId: `hook-${appId}`, appId, render })
  })
}

const imagesFor = (networkId: string): Record<string, unknown> =>
  useNodeGraphicsStore.getState().images[networkId] ?? {}

describe('useNodeGraphicsSync', () => {
  beforeEach(async () => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    })
    vi.clearAllMocks()
    mockIsHydrating.mockReturnValue(false)
    const { useTableStore } = await import(
      '../../../data/hooks/stores/TableStore'
    )
    ;(useTableStore as any).setState({ tables: {} })
    useNodeGraphicsStore.setState({
      hooks: [],
      images: {},
      refreshRequests: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns undefined and runs nothing when no hook is registered', async () => {
    await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))

    const { result } = renderHook(() => useNodeGraphicsSync('net1'))
    await drain()

    expect(result.current).toBeUndefined()
    expect(imagesFor('net1')).toEqual({})
  })

  it('runs the hook for every node on mount', async () => {
    await setNodeTable(
      'net1',
      tableOf([
        ['n1', { score: 1 }],
        ['n2', { score: 2 }],
      ]),
    )
    const render = vi.fn(() => 'https://example.com/a.png')
    registerHook(render)

    renderHook(() => useNodeGraphicsSync('net1'))
    await drain()

    expect(render).toHaveBeenCalledTimes(2)
    expect(Object.keys(imagesFor('net1')).sort()).toEqual(['n1', 'n2'])
  })

  it('passes a copy of the row, so a hook cannot mutate host state', async () => {
    const row = { score: 1 }
    await setNodeTable('net1', tableOf([['n1', row]]))
    const render = vi.fn((req: any) => {
      req.attributes.score = 999
      return 'https://example.com/a.png'
    })
    registerHook(render)

    renderHook(() => useNodeGraphicsSync('net1'))
    await drain()

    expect(row.score).toBe(1)
  })

  it('skips a node when the hook returns null', async () => {
    await setNodeTable(
      'net1',
      tableOf([
        ['n1', { keep: true }],
        ['n2', { keep: false }],
      ]),
    )
    registerHook((req) =>
      req.attributes.keep === true ? 'https://example.com/a.png' : null,
    )

    renderHook(() => useNodeGraphicsSync('net1'))
    await drain()

    expect(Object.keys(imagesFor('net1'))).toEqual(['n1'])
  })

  describe('invalidation', () => {
    it('re-runs only the rows a table edit touched', async () => {
      const untouched = { score: 1 }
      await setNodeTable(
        'net1',
        tableOf([
          ['n1', untouched],
          ['n2', { score: 2 }],
        ]),
      )
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      expect(render).toHaveBeenCalledTimes(2)
      render.mockClear()

      // Only n2's row object changes.
      await act(async () => {
        await setNodeTable(
          'net1',
          tableOf([
            ['n1', untouched],
            ['n2', { score: 99 }],
          ]),
        )
      })
      await drain()

      expect(render).toHaveBeenCalledTimes(1)
      expect(render.mock.calls[0][0].nodeId).toBe('n2')
    })

    it('coalesces a burst of writes into one flush', async () => {
      const rows: Array<[string, Record<string, ValueType>]> = Array.from(
        { length: 5 },
        (_, i) => [`n${i}`, { score: i }],
      )
      await setNodeTable('net1', tableOf(rows))
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      render.mockClear()

      // Three writes inside the coalescing window, each rebuilding every row —
      // as a column rename does.
      await act(async () => {
        for (let pass = 1; pass <= 3; pass++) {
          await setNodeTable(
            'net1',
            tableOf(rows.map(([id, r]) => [id, { ...r, pass }])),
          )
        }
      })
      await drain()

      // One flush over 5 nodes, not three.
      expect(render).toHaveBeenCalledTimes(5)
    })

    it('drops a deleted node’s image without calling the hook', async () => {
      const keep = { score: 1 }
      await setNodeTable(
        'net1',
        tableOf([
          ['n1', keep],
          ['n2', { score: 2 }],
        ]),
      )
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      render.mockClear()

      await act(async () => {
        await setNodeTable('net1', tableOf([['n1', keep]]))
      })
      await drain()

      expect(imagesFor('net1').n2).toBeUndefined()
      expect(render).not.toHaveBeenCalled()
    })

    it('re-runs everything when an app calls refresh', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      let url = 'https://example.com/a.png'
      const render = vi.fn(() => url)
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      render.mockClear()

      url = 'https://example.com/b.png'
      act(() => {
        useNodeGraphicsStore.getState().requestRefresh('net1')
      })
      await drain()

      expect(render).toHaveBeenCalledTimes(1)
      expect((imagesFor('net1').n1 as any).image).toBe(
        'https://example.com/b.png',
      )
    })

    it('re-runs only the nodes named in a scoped refresh', async () => {
      await setNodeTable(
        'net1',
        tableOf([
          ['n1', { score: 1 }],
          ['n2', { score: 2 }],
        ]),
      )
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      render.mockClear()

      act(() => {
        useNodeGraphicsStore.getState().requestRefresh('net1', ['n2'])
      })
      await drain()

      expect(render).toHaveBeenCalledTimes(1)
      expect(render.mock.calls[0][0].nodeId).toBe('n2')
    })

    it('skips a re-run whose image is unchanged', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      registerHook(() => 'https://example.com/a.png')

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      const first = imagesFor('net1').n1

      await act(async () => {
        await setNodeTable('net1', tableOf([['n1', { score: 2 }]]))
      })
      await drain()

      // Identical image string → no new entry, so Cytoscape's unbounded image
      // cache is not re-entered for nothing.
      expect(imagesFor('net1').n1).toBe(first)
    })
  })

  describe('hook lifecycle', () => {
    it('drops every image when the last hook is removed', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      registerHook(() => 'https://example.com/a.png')

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      expect(imagesFor('net1').n1).toBeDefined()

      act(() => {
        useNodeGraphicsStore.getState().removeAllByAppId('app-a')
      })
      await drain()

      expect(imagesFor('net1')).toEqual({})
    })

    it('re-runs every node when a hook is registered after mount', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      expect(imagesFor('net1')).toEqual({})

      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)
      await drain()

      expect(render).toHaveBeenCalledTimes(1)
    })

    it('lets a second hook serve nodes the first declines', async () => {
      await setNodeTable(
        'net1',
        tableOf([
          ['n1', { owner: 'a' }],
          ['n2', { owner: 'b' }],
        ]),
      )
      registerHook(
        (req) =>
          req.attributes.owner === 'a' ? 'https://a.example/x.png' : null,
        'app-a',
      )
      registerHook(
        (req) =>
          req.attributes.owner === 'b' ? 'https://b.example/x.png' : null,
        'app-b',
      )

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()

      expect((imagesFor('net1').n1 as any).image).toBe(
        'https://a.example/x.png',
      )
      expect((imagesFor('net1').n2 as any).image).toBe(
        'https://b.example/x.png',
      )
    })

    it('clears the network on unmount', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      registerHook(() => 'https://example.com/a.png')

      const { unmount } = renderHook(() => useNodeGraphicsSync('net1'))
      await drain()
      expect(imagesFor('net1').n1).toBeDefined()

      act(() => {
        unmount()
      })

      expect(imagesFor('net1')).toEqual({})
    })
  })

  describe('failure containment', () => {
    it('yields no image for a node whose hook throws', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      registerHook(() => {
        throw new Error('boom')
      })

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()

      expect(imagesFor('net1')).toEqual({})
    })

    it('keeps rendering other nodes when one call throws', async () => {
      await setNodeTable(
        'net1',
        tableOf([
          ['n1', { bad: true }],
          ['n2', { bad: false }],
        ]),
      )
      registerHook((req) => {
        if (req.attributes.bad === true) throw new Error('boom')
        return 'https://example.com/a.png'
      })

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()

      expect(Object.keys(imagesFor('net1'))).toEqual(['n2'])
    })

    it('stops calling a hook that exhausts its failure budget', async () => {
      // 25 nodes, all throwing, against a budget of 20.
      const rows: Array<[string, Record<string, ValueType>]> = Array.from(
        { length: 25 },
        (_, i) => [`n${i}`, { score: i }],
      )
      await setNodeTable('net1', tableOf(rows))
      const render = vi.fn(() => {
        throw new Error('boom')
      })
      registerHook(render)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()

      expect(render.mock.calls.length).toBeLessThanOrEqual(20)
      render.mockClear()

      // A later edit must not revive it.
      await act(async () => {
        await setNodeTable(
          'net1',
          tableOf(rows.map(([id, r]) => [id, { ...r, again: true }])),
        )
      })
      await drain()

      expect(render).not.toHaveBeenCalled()
    })
  })

  describe('cross-tab hydration', () => {
    it('defers the flush while hydrating, then runs it', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)
      mockIsHydrating.mockReturnValue(true)

      renderHook(() => useNodeGraphicsSync('net1'))
      await drain()

      // A peer tab's write replaces the whole table, so every row looks changed.
      // Running then would re-derive the entire network for nothing.
      expect(render).not.toHaveBeenCalled()

      mockIsHydrating.mockReturnValue(false)
      await drain()

      expect(render).toHaveBeenCalledTimes(1)
    })
  })

  describe('network switching', () => {
    it('runs against the new network after a switch', async () => {
      await setNodeTable('net1', tableOf([['n1', { score: 1 }]]))
      await setNodeTable('net2', tableOf([['n9', { score: 9 }]]))
      const render = vi.fn<NodeGraphicsRenderHook>(
        () => 'https://example.com/a.png',
      )
      registerHook(render)

      const { rerender } = renderHook(
        ({ id }: { id: string }) => useNodeGraphicsSync(id),
        { initialProps: { id: 'net1' } },
      )
      await drain()
      render.mockClear()

      act(() => {
        rerender({ id: 'net2' })
      })
      await drain()

      expect(render.mock.calls.every((c) => c[0].networkId === 'net2')).toBe(
        true,
      )
      expect(imagesFor('net2').n9).toBeDefined()
    })

    it('does not write images for the old network after switching', async () => {
      // 500 nodes span multiple chunks, so a switch lands mid-flush.
      const rows: Array<[string, Record<string, ValueType>]> = Array.from(
        { length: 500 },
        (_, i) => [`n${i}`, { score: i }],
      )
      await setNodeTable('net1', tableOf(rows))
      await setNodeTable('net2', tableOf([['z1', { score: 0 }]]))
      registerHook(() => 'https://example.com/a.png')

      const { rerender } = renderHook(
        ({ id }: { id: string }) => useNodeGraphicsSync(id),
        { initialProps: { id: 'net1' } },
      )

      // Fire the coalescing timer and exactly one frame, leaving chunks queued.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(COALESCE_MS + 1)
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
      })

      act(() => {
        rerender({ id: 'net2' })
      })
      await drain(10)

      // The generation bump must have dropped the queued chunks; net1 was
      // cleared and nothing may have refilled it.
      expect(imagesFor('net1')).toEqual({})
      expect(imagesFor('net2').z1).toBeDefined()
    })
  })
})
