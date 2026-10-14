import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/nodeGraphicsApi.test.ts
// Plain tests for the nodeGraphicsApi core — no renderHook, no React context.
import type { NodeGraphicsRenderHook } from '../../models/StoreModel/NodeGraphicsStoreModel'
import { AppCodes, StyleCodes } from '../types/ApiResult'
import { createNodeGraphicsApi, nodeGraphicsApi } from './nodeGraphicsApi'

// ── Mock: NodeGraphicsStore ───────────────────────────────────────────────────
// A hand-rolled stand-in so these tests assert the API's contract (validation,
// ownership scoping, error codes) rather than re-testing store internals, which
// NodeGraphicsStore.spec.ts covers.

interface StoredHook {
  hookId: string
  appId?: string
  render: NodeGraphicsRenderHook
}

let hooks: StoredHook[] = []
let refreshRequests: Record<string, { token: number; nodeIds?: string[] }> = {}

const mockSetHook = vi.fn((hook: StoredHook) => {
  hooks = hooks.filter((h) => h.appId !== hook.appId)
  hooks.push(hook)
})
const mockRemoveAllByAppId = vi.fn((appId: string) => {
  hooks = hooks.filter((h) => h.appId === undefined || h.appId !== appId)
})
const mockRemoveAnonymousHook = vi.fn(() => {
  hooks = hooks.filter((h) => h.appId !== undefined)
})
const mockRequestRefresh = vi.fn((networkId: string, nodeIds?: string[]) => {
  refreshRequests[networkId] = {
    token: (refreshRequests[networkId]?.token ?? 0) + 1,
    nodeIds,
  }
})

vi.mock('../../data/hooks/stores/NodeGraphicsStore', () => ({
  useNodeGraphicsStore: {
    getState: vi.fn(() => ({
      get hooks() {
        return hooks
      },
      setHook: mockSetHook,
      removeAllByAppId: mockRemoveAllByAppId,
      removeAnonymousHook: mockRemoveAnonymousHook,
      requestRefresh: mockRequestRefresh,
    })),
  },
}))

// ── Mock: NetworkStore ────────────────────────────────────────────────────────

const mockNetworks = new Map<string, any>()

vi.mock('../../data/hooks/stores/NetworkStore', () => ({
  useNetworkStore: {
    getState: vi.fn(() => ({ networks: mockNetworks })),
  },
}))

// ── Mock: WorkspaceStore ──────────────────────────────────────────────────────

let currentNetworkId = 'net1'

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({ workspace: { currentNetworkId } })),
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

const hook: NodeGraphicsRenderHook = () => 'https://example.com/a.png'

describe('nodeGraphicsApi', () => {
  beforeEach(() => {
    hooks = []
    refreshRequests = {}
    currentNetworkId = 'net1'
    mockNetworks.clear()
    mockNetworks.set('net1', { nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [] })
    vi.clearAllMocks()
  })

  describe('setRenderHook', () => {
    it('returns ok with a hookId', () => {
      const result = createNodeGraphicsApi('app-a').setRenderHook(hook)

      expect(result.success).toBe(true)
      expect(result.success && result.data.hookId).toBeTruthy()
    })

    it('registers the hook against the calling app', () => {
      createNodeGraphicsApi('app-a').setRenderHook(hook)

      expect(mockSetHook).toHaveBeenCalledWith(
        expect.objectContaining({ appId: 'app-a', render: hook }),
      )
    })

    it('registers with no appId on the anonymous singleton', () => {
      nodeGraphicsApi.setRenderHook(hook)

      expect(mockSetHook).toHaveBeenCalledWith(
        expect.objectContaining({ appId: undefined }),
      )
    })

    it('issues a distinct hookId per registration', () => {
      const api = createNodeGraphicsApi('app-a')
      const first = api.setRenderHook(hook)
      const second = api.setRenderHook(hook)

      expect(first.success && second.success).toBe(true)
      expect(first.success && second.success && first.data.hookId).not.toBe(
        second.success ? second.data.hookId : '',
      )
    })

    it.each([
      ['a string', 'not-a-function'],
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['an object', {}],
    ])('fails with INVALID_CUSTOM_GRAPHICS when given %s', (_label, value) => {
      const result = createNodeGraphicsApi('app-a').setRenderHook(value as any)

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        StyleCodes.INVALID_CUSTOM_GRAPHICS.code,
      )
      expect(mockSetHook).not.toHaveBeenCalled()
    })
  })

  describe('clearRenderHook', () => {
    it('removes the calling app’s hook', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.clearRenderHook()

      expect(result.success).toBe(true)
      expect(mockRemoveAllByAppId).toHaveBeenCalledWith('app-a')
    })

    it('fails with FUNCTION_NOT_AVAILABLE when the app has no hook', () => {
      const result = createNodeGraphicsApi('app-a').clearRenderHook()

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.FUNCTION_NOT_AVAILABLE.code,
      )
    })

    it('does not let one app clear another app’s hook', () => {
      createNodeGraphicsApi('app-a').setRenderHook(hook)

      const result = createNodeGraphicsApi('app-b').clearRenderHook()

      expect(result.success).toBe(false)
      expect(mockRemoveAllByAppId).not.toHaveBeenCalled()
    })

    it('uses the anonymous path for the singleton', () => {
      nodeGraphicsApi.setRenderHook(hook)

      const result = nodeGraphicsApi.clearRenderHook()

      expect(result.success).toBe(true)
      expect(mockRemoveAnonymousHook).toHaveBeenCalled()
      expect(mockRemoveAllByAppId).not.toHaveBeenCalled()
    })

    it('does not let the singleton clear an app-owned hook', () => {
      createNodeGraphicsApi('app-a').setRenderHook(hook)

      expect(nodeGraphicsApi.clearRenderHook().success).toBe(false)
    })
  })

  describe('refresh', () => {
    it('bumps the refresh token for an explicit network', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.refresh('net1')

      expect(result.success).toBe(true)
      expect(mockRequestRefresh).toHaveBeenCalledWith('net1', undefined)
    })

    it('reports the whole-network node count when no ids are given', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.refresh('net1')

      expect(result.success && result.data.nodeCount).toBe(2)
    })

    it('reports the requested count when ids are given', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.refresh('net1', ['n1'])

      expect(result.success && result.data.nodeCount).toBe(1)
      expect(mockRequestRefresh).toHaveBeenCalledWith('net1', ['n1'])
    })

    it('falls back to the workspace current network', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      api.refresh()

      expect(mockRequestRefresh).toHaveBeenCalledWith('net1', undefined)
    })

    it('fails with FUNCTION_NOT_AVAILABLE when no hook is registered', () => {
      const result = createNodeGraphicsApi('app-a').refresh('net1')

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.FUNCTION_NOT_AVAILABLE.code,
      )
      expect(mockRequestRefresh).not.toHaveBeenCalled()
    })

    it('fails with NO_CURRENT_NETWORK when nothing is selected', () => {
      currentNetworkId = ''
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.refresh()

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.NO_CURRENT_NETWORK.code,
      )
    })

    it('fails with NETWORK_NOT_FOUND for an unknown network', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)

      const result = api.refresh('nope')

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.NETWORK_NOT_FOUND.code,
      )
    })
  })

  describe('never throws across the API boundary', () => {
    it('converts a store throw into OPERATION_FAILED', () => {
      mockSetHook.mockImplementationOnce(() => {
        throw new Error('boom')
      })

      const result = createNodeGraphicsApi('app-a').setRenderHook(hook)

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.OPERATION_FAILED.code,
      )
    })

    it('converts a throw during refresh into OPERATION_FAILED', () => {
      const api = createNodeGraphicsApi('app-a')
      api.setRenderHook(hook)
      mockRequestRefresh.mockImplementationOnce(() => {
        throw new Error('boom')
      })

      const result = api.refresh('net1')

      expect(result.success).toBe(false)
      expect(!result.success && result.error.code).toBe(
        AppCodes.OPERATION_FAILED.code,
      )
    })
  })
})
