// src/app-api/core/resourceApi.test.ts
//
// Plain Jest tests for the per-app ResourceApi factory.
// Mocks AppResourceStore, AppStore, and WorkspaceStore.

import { enableMapSet } from 'immer'

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { createResourceApi } from './resourceApi'

enableMapSet()

// ── Mock stores ─────────────────────────────────────────────────

jest.mock('../../data/hooks/stores/AppResourceStore', () => ({
  useAppResourceStore: { getState: jest.fn() },
}))

jest.mock('../../data/hooks/stores/AppStore', () => ({
  useAppStore: { getState: jest.fn() },
}))

jest.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: { getState: jest.fn() },
}))

jest.mock('../../debug', () => ({
  logApp: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}))

const DummyComponent = () => null

function makeMockResourceStore(
  overrides: Partial<{
    resources: any[]
    upsertResource: jest.Mock
    removeResource: jest.Mock
    hasResource: jest.Mock
    removeAllByAppId: jest.Mock
  }> = {},
) {
  return {
    resources: [],
    upsertResource: jest.fn(),
    removeResource: jest.fn(),
    hasResource: jest.fn(() => false),
    removeAllByAppId: jest.fn(),
    ...overrides,
  }
}

describe('createResourceApi', () => {
  let mockStore: ReturnType<typeof makeMockResourceStore>

  beforeEach(() => {
    mockStore = makeMockResourceStore()
    jest
      .mocked(useAppResourceStore.getState)
      .mockReturnValue(mockStore as any)
    jest.mocked(useAppStore.getState).mockReturnValue({
      apps: { app1: { status: AppStatus.Active } },
    } as any)
    jest.mocked(useWorkspaceStore.getState).mockReturnValue({
      workspace: { currentNetworkId: 'net1' },
    } as any)
    jest.clearAllMocks()
  })

  // ── getSupportedSlots ───────────────────────────────────────────

  describe('getSupportedSlots', () => {
    it('returns right-panel and apps-menu', () => {
      const api = createResourceApi('app1')
      expect(api.getSupportedSlots()).toEqual(['right-panel', 'apps-menu'])
    })

    it('returns a copy (not mutable reference)', () => {
      const api = createResourceApi('app1')
      const a = api.getSupportedSlots()
      const b = api.getSupportedSlots()
      expect(a).not.toBe(b)
    })
  })

  // ── registerPanel ───────────────────────────────────────────────

  describe('registerPanel', () => {
    it('returns ok with correct resourceId', () => {
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: 'P1',
        component: DummyComponent,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resourceId).toBe('app1::right-panel::P1')
      }
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
        }),
      )
    })

    it('passes title, order, group, requires to store', () => {
      const api = createResourceApi('app1')
      api.registerPanel({
        id: 'P1',
        title: 'My Panel',
        order: 10,
        group: 'tools',
        requires: { network: true },
        component: DummyComponent,
      })

      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Panel',
          order: 10,
          group: 'tools',
          requires: { network: true },
        }),
      )
    })

    it('returns fail(InvalidInput) for empty id', () => {
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: '',
        component: DummyComponent,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT')
      }
    })

    it('returns fail(InvalidInput) for whitespace-only id', () => {
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: '   ',
        component: DummyComponent,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT')
      }
    })

    it('returns fail(InvalidInput) for primitive component (string)', () => {
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: 'P1',
        component: 'not-a-component' as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT')
      }
    })

    it('returns fail(InvalidInput) for null component', () => {
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: 'P1',
        component: null as any,
      })

      expect(result.success).toBe(false)
    })

    it('accepts React.lazy-like object component (typeof === object)', () => {
      const lazyLike = { $$typeof: Symbol('react.lazy'), _payload: {} }
      const api = createResourceApi('app1')
      const result = api.registerPanel({
        id: 'P1',
        component: lazyLike as any,
      })

      expect(result.success).toBe(true)
    })

    it('upserts on second call with same id (no error)', () => {
      const api = createResourceApi('app1')
      api.registerPanel({ id: 'P1', title: 'Old', component: DummyComponent })
      const result = api.registerPanel({
        id: 'P1',
        title: 'New',
        component: DummyComponent,
      })

      expect(result.success).toBe(true)
      expect(mockStore.upsertResource).toHaveBeenCalledTimes(2)
      expect(mockStore.upsertResource).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'P1', title: 'New' }),
      )
    })
  })

  // ── unregisterPanel ─────────────────────────────────────────────

  describe('unregisterPanel', () => {
    it('returns ok when panel exists', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.unregisterPanel('P1')

      expect(result.success).toBe(true)
      expect(mockStore.removeResource).toHaveBeenCalledWith(
        'app1',
        'right-panel',
        'P1',
      )
    })

    it('returns fail(ResourceNotFound) when panel does not exist', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.unregisterPanel('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('RESOURCE_NOT_FOUND')
      }
    })
  })

  // ── registerMenuItem ────────────────────────────────────────────

  describe('registerMenuItem', () => {
    it('returns ok with correct resourceId for apps-menu slot', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        component: DummyComponent,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resourceId).toBe('app1::apps-menu::M1')
      }
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'M1',
          appId: 'app1',
          slot: 'apps-menu',
        }),
      )
    })

    it('passes closeOnAction to store', () => {
      const api = createResourceApi('app1')
      api.registerMenuItem({
        id: 'M1',
        component: DummyComponent,
        closeOnAction: true,
      })

      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ closeOnAction: true }),
      )
    })

    it('returns fail(InvalidInput) for empty id', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: '',
        component: DummyComponent,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT')
      }
    })

    it('returns fail(InvalidInput) for primitive component (number)', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        component: 42 as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_INPUT')
      }
    })
  })

  // ── unregisterMenuItem ──────────────────────────────────────────

  describe('unregisterMenuItem', () => {
    it('returns ok when item exists', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.unregisterMenuItem('M1')

      expect(result.success).toBe(true)
      expect(mockStore.removeResource).toHaveBeenCalledWith(
        'app1',
        'apps-menu',
        'M1',
      )
    })

    it('returns fail(ResourceNotFound) when item does not exist', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.unregisterMenuItem('ghost')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('RESOURCE_NOT_FOUND')
      }
    })
  })

  // ── unregisterAll ───────────────────────────────────────────────

  describe('unregisterAll', () => {
    it('delegates to removeAllByAppId with bound appId', () => {
      const api = createResourceApi('app1')
      const result = api.unregisterAll()

      expect(result.success).toBe(true)
      expect(mockStore.removeAllByAppId).toHaveBeenCalledWith('app1')
    })
  })

  // ── registerAll ─────────────────────────────────────────────────

  describe('registerAll', () => {
    it('registers multiple resources in one call', () => {
      const api = createResourceApi('app1')
      const result = api.registerAll([
        {
          slot: 'right-panel',
          id: 'P1',
          component: DummyComponent,
        },
        {
          slot: 'apps-menu',
          id: 'M1',
          component: DummyComponent,
        },
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.registered).toHaveLength(2)
        expect(result.data.errors).toHaveLength(0)
      }
    })

    it('skips entries that fail validation but does not block others', () => {
      const api = createResourceApi('app1')
      const result = api.registerAll([
        { slot: 'right-panel', id: '', component: DummyComponent }, // fails: empty id
        { slot: 'apps-menu', id: 'M1', component: DummyComponent }, // succeeds
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.registered).toHaveLength(1)
        expect(result.data.errors).toHaveLength(1)
        expect(result.data.errors[0].id).toBe('')
        expect(result.data.errors[0].slot).toBe('right-panel')
      }
    })

    it('pushes error for unsupported slot', () => {
      const api = createResourceApi('app1')
      const result = api.registerAll([
        {
          slot: 'bottom-panel' as any,
          id: 'X',
          component: DummyComponent,
        },
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.registered).toHaveLength(0)
        expect(result.data.errors).toHaveLength(1)
        expect(result.data.errors[0].error.code).toBe('INVALID_INPUT')
        expect(result.data.errors[0].error.message).toContain(
          'Unsupported slot',
        )
      }
    })

    it('always returns ok even when all entries fail', () => {
      const api = createResourceApi('app1')
      const result = api.registerAll([
        { slot: 'right-panel', id: '', component: DummyComponent },
      ])

      expect(result.success).toBe(true)
    })
  })

  // ── getRegisteredResources ──────────────────────────────────────

  describe('getRegisteredResources', () => {
    it('returns only resources for the bound appId', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          title: 'Mine',
          component: {},
        },
        {
          id: 'P2',
          appId: 'app2',
          slot: 'right-panel',
          component: {},
        },
      ]
      jest
        .mocked(useAppResourceStore.getState)
        .mockReturnValue(mockStore as any)

      const api = createResourceApi('app1')
      const resources = api.getRegisteredResources()

      expect(resources).toHaveLength(1)
      expect(resources[0].resourceId).toBe('app1::right-panel::P1')
      expect(resources[0].title).toBe('Mine')
    })

    it('returns empty array when no resources are registered', () => {
      const api = createResourceApi('app1')
      expect(api.getRegisteredResources()).toEqual([])
    })
  })

  // ── getResourceVisibility ───────────────────────────────────────

  describe('getResourceVisibility', () => {
    it('returns { registered: false } when resource is not found', () => {
      const api = createResourceApi('app1')
      const vis = api.getResourceVisibility('nonexistent')
      expect(vis).toEqual({ registered: false, visible: false })
    })

    it('returns hiddenReason: app-inactive when app is not active', () => {
      mockStore.resources = [
        { id: 'P1', appId: 'app1', slot: 'right-panel', component: {} },
      ]
      jest
        .mocked(useAppResourceStore.getState)
        .mockReturnValue(mockStore as any)
      jest.mocked(useAppStore.getState).mockReturnValue({
        apps: { app1: { status: AppStatus.Inactive } },
      } as any)

      const api = createResourceApi('app1')
      const vis = api.getResourceVisibility('P1')
      expect(vis).toEqual({
        registered: true,
        visible: false,
        hiddenReason: 'app-inactive',
      })
    })

    it('returns hiddenReason: requires-network when no network loaded', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          requires: { network: true },
          component: {},
        },
      ]
      jest
        .mocked(useAppResourceStore.getState)
        .mockReturnValue(mockStore as any)
      jest.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspace: { currentNetworkId: '' },
      } as any)

      const api = createResourceApi('app1')
      const vis = api.getResourceVisibility('P1')
      expect(vis).toEqual({
        registered: true,
        visible: false,
        hiddenReason: 'requires-network',
      })
    })

    it('returns hiddenReason: requires-selection when selection required', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          requires: { selection: true },
          component: {},
        },
      ]
      jest
        .mocked(useAppResourceStore.getState)
        .mockReturnValue(mockStore as any)

      const api = createResourceApi('app1')
      const vis = api.getResourceVisibility('P1')
      expect(vis).toEqual({
        registered: true,
        visible: false,
        hiddenReason: 'requires-selection',
      })
    })

    it('returns visible: true when all conditions are met', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          requires: { network: true },
          component: {},
        },
      ]
      jest
        .mocked(useAppResourceStore.getState)
        .mockReturnValue(mockStore as any)
      // AppStore: active, WorkspaceStore: has network (default mocks)

      const api = createResourceApi('app1')
      const vis = api.getResourceVisibility('P1')
      expect(vis).toEqual({ registered: true, visible: true })
    })
  })

  // ── appId isolation ─────────────────────────────────────────────

  describe('appId isolation', () => {
    it('two factories with different appIds produce independent resourceIds', () => {
      const api1 = createResourceApi('app1')
      const api2 = createResourceApi('app2')

      const r1 = api1.registerPanel({ id: 'P1', component: DummyComponent })
      const r2 = api2.registerPanel({ id: 'P1', component: DummyComponent })

      expect(r1.success && r1.data.resourceId).toBe(
        'app1::right-panel::P1',
      )
      expect(r2.success && r2.data.resourceId).toBe(
        'app2::right-panel::P1',
      )
    })

    it('unregisterAll only affects the bound appId', () => {
      const api = createResourceApi('app1')
      api.unregisterAll()

      expect(mockStore.removeAllByAppId).toHaveBeenCalledWith('app1')
    })
  })
})
