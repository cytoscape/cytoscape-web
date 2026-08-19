import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NodeGraphicsRenderHook,
  ResolvedNodeGraphics,
} from '../../../models/StoreModel/NodeGraphicsStoreModel'
import { cleanupAllForApp } from './AppCleanupRegistry'
import { useNodeGraphicsStore } from './NodeGraphicsStore'

const noopHook: NodeGraphicsRenderHook = () => null

const image = (
  hookId: string,
  url = 'https://example.com/a.png',
): ResolvedNodeGraphics => ({
  image: url,
  fit: 'contain',
  opacity: 1,
  crossOrigin: 'null',
  containment: 'inside',
  hookId,
})

describe('NodeGraphicsStore', () => {
  beforeEach(() => {
    act(() => {
      useNodeGraphicsStore.setState({
        hooks: [],
        images: {},
        refreshRequests: {},
      })
    })
  })

  describe('setHook', () => {
    it('registers a hook', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
      })

      expect(result.current.hooks).toHaveLength(1)
      expect(result.current.hooks[0].hookId).toBe('h1')
    })

    it('keeps the render function callable (immer must not freeze it away)', () => {
      const render = vi.fn(() => 'https://example.com/x.png')
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render })
      })

      const stored = useNodeGraphicsStore.getState().hooks[0]
      expect(typeof stored.render).toBe('function')
      expect(
        stored.render({ networkId: 'net1', nodeId: 'n1', attributes: {} }),
      ).toBe('https://example.com/x.png')
      expect(render).toHaveBeenCalledOnce()
    })

    it('replaces the same app’s previous hook rather than adding one', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setHook({ hookId: 'h2', appId: 'a', render: noopHook })
      })

      expect(result.current.hooks).toHaveLength(1)
      expect(result.current.hooks[0].hookId).toBe('h2')
    })

    it('drops images produced by the replaced hook', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setImages('net1', [['n1', image('h1')]])
      })
      expect(result.current.images.net1.n1).toBeDefined()

      act(() => {
        result.current.setHook({ hookId: 'h2', appId: 'a', render: noopHook })
      })

      // Stale pictures from the old hook must not survive re-registration.
      expect(result.current.images.net1?.n1).toBeUndefined()
    })

    it('keeps hooks from different apps side by side, in registration order', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setHook({ hookId: 'h2', appId: 'b', render: noopHook })
      })

      expect(result.current.hooks.map((h) => h.hookId)).toEqual(['h1', 'h2'])
    })

    it('treats the anonymous hook as its own owner', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setHook({ hookId: 'anon', render: noopHook })
      })

      expect(result.current.hooks).toHaveLength(2)
    })
  })

  describe('removeAllByAppId', () => {
    it('removes the app’s hook and its images', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setImages('net1', [['n1', image('h1')]])
        result.current.removeAllByAppId('a')
      })

      expect(result.current.hooks).toHaveLength(0)
      expect(result.current.images.net1?.n1).toBeUndefined()
    })

    it('leaves another app’s hook and images alone', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setHook({ hookId: 'h2', appId: 'b', render: noopHook })
        result.current.setImages('net1', [
          ['n1', image('h1')],
          ['n2', image('h2')],
        ])
        result.current.removeAllByAppId('a')
      })

      expect(result.current.hooks.map((h) => h.hookId)).toEqual(['h2'])
      expect(result.current.images.net1.n1).toBeUndefined()
      expect(result.current.images.net1.n2).toBeDefined()
    })

    it('never removes the anonymous hook', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'anon', render: noopHook })
        result.current.removeAllByAppId('a')
      })

      expect(result.current.hooks).toHaveLength(1)
    })
  })

  describe('removeAnonymousHook', () => {
    it('removes only the anonymous hook and its images', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({ hookId: 'anon', render: noopHook })
        result.current.setHook({ hookId: 'h1', appId: 'a', render: noopHook })
        result.current.setImages('net1', [
          ['n1', image('anon')],
          ['n2', image('h1')],
        ])
        result.current.removeAnonymousHook()
      })

      expect(result.current.hooks.map((h) => h.hookId)).toEqual(['h1'])
      expect(result.current.images.net1.n1).toBeUndefined()
      expect(result.current.images.net1.n2).toBeDefined()
    })
  })

  describe('images', () => {
    it('merges entries rather than replacing the network map', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setImages('net1', [['n1', image('h1', 'a.png')]])
        result.current.setImages('net1', [['n2', image('h1', 'b.png')]])
      })

      expect(Object.keys(result.current.images.net1).sort()).toEqual([
        'n1',
        'n2',
      ])
    })

    it('overwrites an existing node entry', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setImages('net1', [
          ['n1', image('h1', 'https://example.com/old.png')],
        ])
        result.current.setImages('net1', [
          ['n1', image('h1', 'https://example.com/new.png')],
        ])
      })

      expect(result.current.images.net1.n1.image).toBe(
        'https://example.com/new.png',
      )
    })

    it('keeps networks independent', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setImages('net1', [['n1', image('h1')]])
        result.current.setImages('net2', [['n1', image('h1')]])
        result.current.clearNetwork('net1')
      })

      expect(result.current.images.net1).toBeUndefined()
      expect(result.current.images.net2.n1).toBeDefined()
    })

    it('clearImages drops only the named nodes', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setImages('net1', [
          ['n1', image('h1')],
          ['n2', image('h1')],
          ['n3', image('h1')],
        ])
        result.current.clearImages('net1', ['n1', 'n3'])
      })

      expect(Object.keys(result.current.images.net1)).toEqual(['n2'])
    })

    it('clearImages on an unknown network is a no-op', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      expect(() =>
        act(() => {
          result.current.clearImages('nope', ['n1'])
        }),
      ).not.toThrow()
    })
  })

  describe('requestRefresh', () => {
    it('starts at 1 and increments monotonically', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1')
      })
      expect(result.current.refreshRequests.net1.token).toBe(1)

      act(() => {
        result.current.requestRefresh('net1')
      })
      expect(result.current.refreshRequests.net1.token).toBe(2)
    })

    it('carries the requested node ids, or undefined for the whole network', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1', ['n1', 'n2'])
      })
      expect(result.current.refreshRequests.net1.nodeIds).toEqual(['n1', 'n2'])

      act(() => {
        result.current.requestRefresh('net1')
      })
      expect(result.current.refreshRequests.net1.nodeIds).toBeUndefined()
    })

    it('is cleared by clearNetwork', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1')
        result.current.clearNetwork('net1')
      })

      expect(result.current.refreshRequests.net1).toBeUndefined()
    })

    it('merges node ids from an unconsumed request', () => {
      // Both calls land in one tick, so the renderer only ever reads the final
      // entry. Replacing instead of merging would drop n1 entirely.
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1', ['n1'])
        result.current.requestRefresh('net1', ['n2'])
      })

      expect(result.current.refreshRequests.net1.nodeIds).toEqual(['n1', 'n2'])
      expect(result.current.refreshRequests.net1.token).toBe(2)
    })

    it('does not duplicate an id present in both requests', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1', ['n1', 'n2'])
        result.current.requestRefresh('net1', ['n2', 'n3'])
      })

      expect(result.current.refreshRequests.net1.nodeIds).toEqual([
        'n1',
        'n2',
        'n3',
      ])
    })

    it('keeps a pending whole-network request when ids arrive after it', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1')
        result.current.requestRefresh('net1', ['n1'])
      })

      expect(result.current.refreshRequests.net1.nodeIds).toBeUndefined()
    })

    it('copies the caller-supplied array', () => {
      const { result } = renderHook(() => useNodeGraphicsStore())
      const nodeIds = ['n1']

      act(() => {
        result.current.requestRefresh('net1', nodeIds)
      })
      nodeIds.push('n2')

      expect(result.current.refreshRequests.net1.nodeIds).toEqual(['n1'])
    })

    it('starts a fresh request after the renderer consumes one', () => {
      // The ack is what bounds the merge: without it, every later refresh would
      // re-run every node ever refreshed for this network.
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1', ['n1'])
      })
      const token = result.current.refreshRequests.net1.token

      act(() => {
        result.current.consumeRefresh('net1', token)
      })
      expect(result.current.refreshRequests.net1).toBeUndefined()

      act(() => {
        result.current.requestRefresh('net1', ['n2'])
      })
      expect(result.current.refreshRequests.net1.nodeIds).toEqual(['n2'])
    })

    it('ignores an ack for a superseded token', () => {
      // A refresh that arrives after the renderer read the request must not be
      // thrown away with it.
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.requestRefresh('net1', ['n1'])
      })

      act(() => {
        result.current.requestRefresh('net1', ['n2'])
        result.current.consumeRefresh('net1', 1)
      })

      expect(result.current.refreshRequests.net1.token).toBe(2)
      expect(result.current.refreshRequests.net1.nodeIds).toEqual(['n1', 'n2'])
    })
  })

  describe('app lifecycle integration', () => {
    it('cleanupAllForApp removes the app’s hook via the cleanup registry', () => {
      // The store registers its cleanup at module load, so appLifecycle.ts
      // needs no changes to tear down node graphics.
      const { result } = renderHook(() => useNodeGraphicsStore())

      act(() => {
        result.current.setHook({
          hookId: 'h1',
          appId: 'app-x',
          render: noopHook,
        })
        result.current.setImages('net1', [['n1', image('h1')]])
      })

      act(() => {
        cleanupAllForApp('app-x')
      })

      expect(result.current.hooks).toHaveLength(0)
      expect(result.current.images.net1?.n1).toBeUndefined()
    })
  })
})
