// @vitest-environment node
// src/app-api/core/resourceApi.test.ts
//
// Plain Jest tests for the per-app ResourceApi factory.
// Mocks AppResourceStore, AppStore, and WorkspaceStore.
import { enableMapSet } from 'immer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppResourceStore } from '../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../data/hooks/stores/AppStore'
import { useModalLauncherStore } from '../../data/hooks/stores/ModalLauncherStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { createResourceApi } from './resourceApi'

enableMapSet()

// ── Mock stores ─────────────────────────────────────────────────

vi.mock('../../data/hooks/stores/AppResourceStore', () => ({
  useAppResourceStore: { getState: vi.fn() },
}))

vi.mock('../../data/hooks/stores/ModalLauncherStore', () => ({
  useModalLauncherStore: { getState: vi.fn() },
}))

vi.mock('../../data/hooks/stores/AppStore', () => ({
  useAppStore: { getState: vi.fn() },
}))

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: { getState: vi.fn() },
}))

vi.mock('../../data/hooks/stores/ViewModelStore', () => ({
  useViewModelStore: { getState: vi.fn() },
}))

vi.mock('../../debug', () => ({
  logApp: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const DummyComponent = () => null

function makeMockResourceStore(
  overrides: Partial<{
    resources: any[]
    upsertResource: import('vitest').Mock
    removeResource: import('vitest').Mock
    hasResource: import('vitest').Mock
    removeAllByAppId: import('vitest').Mock
  }> = {},
) {
  return {
    resources: [],
    upsertResource: vi.fn(),
    removeResource: vi.fn(),
    hasResource: vi.fn(() => false),
    removeAllByAppId: vi.fn(),
    ...overrides,
  }
}

function makeMockModalLauncherStore() {
  return {
    openModals: [] as Array<{ appId: string; id: string }>,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    closeAllByAppId: vi.fn(),
  }
}

describe('createResourceApi', () => {
  let mockStore: ReturnType<typeof makeMockResourceStore>
  let mockModalStore: ReturnType<typeof makeMockModalLauncherStore>

  beforeEach(() => {
    mockStore = makeMockResourceStore()
    vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
    mockModalStore = makeMockModalLauncherStore()
    vi.mocked(useModalLauncherStore.getState).mockReturnValue(
      mockModalStore as any,
    )
    vi.mocked(useAppStore.getState).mockReturnValue({
      apps: { app1: { status: AppStatus.Active } },
    } as any)
    vi.mocked(useWorkspaceStore.getState).mockReturnValue({
      workspace: { currentNetworkId: 'net1' },
    } as any)
    vi.mocked(useViewModelStore.getState).mockReturnValue({
      getViewModel: vi.fn(() => ({
        selectedNodes: [],
        selectedEdges: [],
      })),
    } as any)
    vi.clearAllMocks()
  })

  // ── getSupportedSlots ───────────────────────────────────────────

  describe('getSupportedSlots', () => {
    it('returns right-panel, apps-menu, search-bar and modal-launcher', () => {
      const api = createResourceApi('app1')
      const result = api.getSupportedSlots()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slots).toEqual([
          'right-panel',
          'apps-menu',
          'search-bar',
          'modal-launcher',
        ])
      }
    })

    it('returns a copy (not mutable reference)', () => {
      const api = createResourceApi('app1')
      const a = api.getSupportedSlots()
      const b = api.getSupportedSlots()
      expect(a.success).toBe(true)
      expect(b.success).toBe(true)
      if (a.success && b.success) {
        expect(a.data.slots).not.toBe(b.data.slots)
      }
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
        expect(result.error.code).toBe('APP9')
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
        expect(result.error.code).toBe('APP9')
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
        expect(result.error.code).toBe('APP9')
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
        expect(result.error.code).toBe('APP7')
      }
    })
  })

  // ── registerMenuItem ────────────────────────────────────────────

  describe('registerMenuItem', () => {
    it('returns ok with correct resourceId and stores the label as title', () => {
      const api = createResourceApi('app1')
      const onClick = vi.fn()
      const result = api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        onClick,
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
          title: 'My Action',
          onClick,
        }),
      )
      // Menu entries are plain data: no component ever reaches the store.
      const stored = mockStore.upsertResource.mock.calls[0][0]
      expect(stored).not.toHaveProperty('component')
    })

    it('passes tooltip, icon, requires and isEnabled to store', () => {
      const api = createResourceApi('app1')
      const isEnabled = () => true
      api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        tooltip: 'Does a thing',
        icon: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
        requires: { network: true },
        isEnabled,
        onClick: () => {},
      })

      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          tooltip: 'Does a thing',
          icon: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
          requires: { network: true },
          isEnabled,
        }),
      )
    })

    it.each([
      ['an https URL', 'https://example.org/icon.png'],
      ['a root-relative host asset', '/images/icon.svg'],
    ])('accepts %s as icon', (_label, icon) => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        onClick: () => {},
        icon,
      })

      expect(result.success).toBe(true)
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ icon }),
      )
    })

    it('returns fail(InvalidInput) for empty id', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: '',
        label: 'My Action',
        onClick: () => {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput) for empty label', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        label: '   ',
        onClick: () => {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) when onClick is not a function', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        onClick: 42 as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('rejects the pre-1.0 component-based shape with a migration hint', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        title: 'Legacy',
        component: DummyComponent,
        closeOnAction: true,
      } as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
        expect(result.error.message).toContain('no longer accept a component')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) when isEnabled is not a function', () => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        onClick: () => {},
        isEnabled: true as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it.each([
      ['a component', DummyComponent],
      ['SVG path data', { svgPath: 'M0,0 L10,10', viewBox: '0 0 10 10' }],
      ['a javascript: URI', 'javascript:alert(1)'],
      ['a bare file name', 'icon.png'],
      ['an empty string', ''],
    ])('returns fail(InvalidInput) when icon is %s', (_label, icon) => {
      const api = createResourceApi('app1')
      const result = api.registerMenuItem({
        id: 'M1',
        label: 'My Action',
        onClick: () => {},
        icon: icon as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
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
        expect(result.error.code).toBe('APP7')
      }
    })
  })

  // ── registerNetworkSearchProvider ───────────────────────────────

  describe('registerNetworkSearchProvider', () => {
    const onSubmit = vi.fn()

    it('returns ok with correct resourceId for search-bar slot', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        onSubmit,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resourceId).toBe('app1::search-bar::S1')
      }
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'S1',
          appId: 'app1',
          slot: 'search-bar',
          title: 'My Search',
          onSubmit,
        }),
      )
    })

    it('stores name as title and passes all provider fields to the store', () => {
      const api = createResourceApi('app1')
      api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        description: 'Searches things',
        icon: 'https://example.org/icon.png',
        website: 'https://example.org',
        placeholder: 'Enter gene names...',
        optionsComponent: DummyComponent,
        onSubmit,
      })

      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Search',
          description: 'Searches things',
          icon: 'https://example.org/icon.png',
          website: 'https://example.org',
          placeholder: 'Enter gene names...',
          component: DummyComponent,
          onSubmit,
        }),
      )
    })

    it('returns fail(InvalidInput) for empty id', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: '',
        name: 'My Search',
        onSubmit,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput) for whitespace-only name', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: '   ',
        onSubmit,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput), not OperationFailed, for non-string id/name/icon/website', () => {
      // Malformed shapes from untyped JS apps must hit the typeof guards,
      // not throw inside .trim()/URL parsing and surface as APP3.
      const api = createResourceApi('app1')
      const cases = [
        { id: 42 as any, name: 'My Search' },
        { id: 'S1', name: null as any },
        { id: 'S1', name: 'My Search', icon: {} as any },
        { id: 'S1', name: 'My Search', website: 123 as any },
      ]
      for (const overrides of cases) {
        const result = api.registerNetworkSearchProvider({
          onSubmit,
          ...overrides,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.code).toBe('APP9')
        }
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) when onSubmit is not a function', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        onSubmit: 'not-a-function' as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput) for a primitive optionsComponent', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        optionsComponent: 'nope' as any,
        onSubmit,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('accepts a provider without optionsComponent', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        onSubmit,
      })

      expect(result.success).toBe(true)
    })

    it('rejects a javascript: icon URI', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        icon: 'javascript:alert(1)',
        onSubmit,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('rejects a non-http(s) website URL', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        website: 'javascript:alert(1)',
        onSubmit,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('accepts a data:image icon and an https website', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        icon: 'data:image/png;base64,iVBORw0KGgo=',
        website: 'https://example.org/about',
        onSubmit,
      })

      expect(result.success).toBe(true)
    })

    it('accepts a root-relative icon path (bundled host asset)', () => {
      const api = createResourceApi('app1')
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'My Search',
        icon: '/assets/ndex-logo.svg',
        onSubmit,
      })

      expect(result.success).toBe(true)
    })

    it('upserts on second call with same id (no error)', () => {
      const api = createResourceApi('app1')
      api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'Old',
        onSubmit,
      })
      const result = api.registerNetworkSearchProvider({
        id: 'S1',
        name: 'New',
        onSubmit,
      })

      expect(result.success).toBe(true)
      expect(mockStore.upsertResource).toHaveBeenCalledTimes(2)
      expect(mockStore.upsertResource).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'S1', title: 'New' }),
      )
    })
  })

  // ── unregisterNetworkSearchProvider ─────────────────────────────

  describe('unregisterNetworkSearchProvider', () => {
    it('returns ok when provider exists', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.unregisterNetworkSearchProvider('S1')

      expect(result.success).toBe(true)
      expect(mockStore.removeResource).toHaveBeenCalledWith(
        'app1',
        'search-bar',
        'S1',
      )
    })

    it('returns fail(ResourceNotFound) when provider does not exist', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.unregisterNetworkSearchProvider('ghost')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
    })
  })

  // ── registerModal ───────────────────────────────────────────────

  describe('registerModal', () => {
    it('returns ok with correct resourceId', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: DummyComponent,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resourceId).toBe('app1::modal-launcher::D1')
      }
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'D1',
          appId: 'app1',
          slot: 'modal-launcher',
        }),
      )
    })

    it('passes maxWidth and fullWidth to store', () => {
      const api = createResourceApi('app1')
      api.registerModal({
        id: 'D1',
        component: DummyComponent,
        maxWidth: 'md',
        fullWidth: true,
      })

      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ maxWidth: 'md', fullWidth: true }),
      )
    })

    it('returns fail(InvalidInput) for missing id', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        component: DummyComponent,
      } as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for non-string id (number)', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 42,
        component: DummyComponent,
      } as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput) for primitive component (string)', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: 'not-a-component',
      } as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
        expect(result.error.message).toContain('component')
      }
    })

    it('accepts a React.lazy-like object component', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: { $$typeof: Symbol.for('react.lazy') } as any,
      })

      expect(result.success).toBe(true)
    })

    it('returns fail(InvalidInput) for a plain object component ({})', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: {} as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
        expect(result.error.message).toContain('component')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for a React element instance', () => {
      const api = createResourceApi('app1')
      // What `<Foo />` compiles to — the element, not the component.
      const element = {
        $$typeof: Symbol.for('react.element'),
        type: DummyComponent,
        props: {},
      }
      const result = api.registerModal({
        id: 'D1',
        component: element as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.upsertResource).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for an invalid maxWidth', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: DummyComponent,
        maxWidth: 'enormous' as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
        expect(result.error.message).toContain('maxWidth')
      }
    })

    it('accepts maxWidth: false', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: DummyComponent,
        maxWidth: false,
      })

      expect(result.success).toBe(true)
      expect(mockStore.upsertResource).toHaveBeenCalledWith(
        expect.objectContaining({ maxWidth: false }),
      )
    })

    it('returns fail(InvalidInput) for a non-boolean fullWidth', () => {
      const api = createResourceApi('app1')
      const result = api.registerModal({
        id: 'D1',
        component: DummyComponent,
        fullWidth: 'yes' as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
        expect(result.error.message).toContain('fullWidth')
      }
    })

    it('upserts on repeated registration with the same id', () => {
      const api = createResourceApi('app1')
      api.registerModal({ id: 'D1', component: DummyComponent })
      const result = api.registerModal({
        id: 'D1',
        component: DummyComponent,
        maxWidth: 'lg',
      })

      expect(result.success).toBe(true)
      expect(mockStore.upsertResource).toHaveBeenCalledTimes(2)
      expect(mockStore.upsertResource).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'D1', maxWidth: 'lg' }),
      )
    })
  })

  // ── unregisterModal ─────────────────────────────────────────────

  describe('unregisterModal', () => {
    it('returns ok and closes the modal when it exists', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.unregisterModal('D1')

      expect(result.success).toBe(true)
      expect(mockStore.removeResource).toHaveBeenCalledWith(
        'app1',
        'modal-launcher',
        'D1',
      )
      expect(mockModalStore.closeModal).toHaveBeenCalledWith('app1', 'D1')
    })

    it('returns fail(ResourceNotFound) when modal does not exist', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.unregisterModal('ghost')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockModalStore.closeModal).not.toHaveBeenCalled()
    })
  })

  // ── openModal ───────────────────────────────────────────────────

  describe('openModal', () => {
    it('opens a registered modal under the bound appId', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.openModal('D1')

      expect(result.success).toBe(true)
      expect(mockStore.hasResource).toHaveBeenCalledWith(
        'app1',
        'modal-launcher',
        'D1',
      )
      expect(mockModalStore.openModal).toHaveBeenCalledWith('app1', 'D1')
    })

    it('returns fail(ResourceNotFound) when the modal is not registered', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.openModal('ghost')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockModalStore.openModal).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for a non-string id', () => {
      const api = createResourceApi('app1')
      const result = api.openModal(42 as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })
  })

  // ── closeModal ──────────────────────────────────────────────────

  describe('closeModal', () => {
    it('closes a registered modal under the bound appId', () => {
      mockStore.hasResource.mockReturnValue(true)
      const api = createResourceApi('app1')
      const result = api.closeModal('D1')

      expect(result.success).toBe(true)
      expect(mockModalStore.closeModal).toHaveBeenCalledWith('app1', 'D1')
    })

    it('returns fail(ResourceNotFound) when the modal is not registered', () => {
      mockStore.hasResource.mockReturnValue(false)
      const api = createResourceApi('app1')
      const result = api.closeModal('ghost')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockModalStore.closeModal).not.toHaveBeenCalled()
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

    it('closes any open modals of the bound appId', () => {
      const api = createResourceApi('app1')
      api.unregisterAll()

      expect(mockModalStore.closeAllByAppId).toHaveBeenCalledWith('app1')
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
          label: 'My Action',
          onClick: () => {},
        },
        {
          slot: 'search-bar',
          id: 'S1',
          name: 'My Search',
          onSubmit: vi.fn(),
        },
        {
          slot: 'modal-launcher',
          id: 'D1',
          component: DummyComponent,
        },
      ])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.registered).toHaveLength(4)
        expect(result.data.errors).toHaveLength(0)
        expect(result.data.registered[3].resourceId).toBe(
          'app1::modal-launcher::D1',
        )
      }
    })

    it('skips entries that fail validation but does not block others', () => {
      const api = createResourceApi('app1')
      const result = api.registerAll([
        { slot: 'right-panel', id: '', component: DummyComponent }, // fails: empty id
        { slot: 'apps-menu', id: 'M1', label: 'M1', onClick: () => {} }, // succeeds
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
        expect(result.data.errors[0].error.code).toBe('APP9')
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
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)

      const api = createResourceApi('app1')
      const result = api.getRegisteredResources()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resources).toHaveLength(1)
        expect(result.data.resources[0].resourceId).toBe(
          'app1::right-panel::P1',
        )
        expect(result.data.resources[0].title).toBe('Mine')
      }
    })

    it('returns empty array when no resources are registered', () => {
      const api = createResourceApi('app1')
      const result = api.getRegisteredResources()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.resources).toEqual([])
      }
    })
  })

  // ── getResourceVisibility ───────────────────────────────────────

  describe('getResourceVisibility', () => {
    const expectVisibility = (
      result: ReturnType<
        ReturnType<typeof createResourceApi>['getResourceVisibility']
      >,
      expected: object,
    ) => {
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(expected)
      }
    }

    it('returns { registered: false } when resource is not found', () => {
      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('nonexistent')
      expectVisibility(result, { registered: false, visible: false })
    })

    it('returns hiddenReason: app-inactive when app is not active', () => {
      mockStore.resources = [
        { id: 'P1', appId: 'app1', slot: 'right-panel', component: {} },
      ]
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
      vi.mocked(useAppStore.getState).mockReturnValue({
        apps: { app1: { status: AppStatus.Inactive } },
      } as any)

      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('P1')
      expectVisibility(result, {
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
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspace: { currentNetworkId: '' },
      } as any)

      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('P1')
      expectVisibility(result, {
        registered: true,
        visible: false,
        hiddenReason: 'requires-network',
      })
    })

    it('returns hiddenReason: requires-selection when nothing is selected', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          requires: { selection: true },
          component: {},
        },
      ]
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
      // Empty selection is the beforeEach default

      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('P1')
      expectVisibility(result, {
        registered: true,
        visible: false,
        hiddenReason: 'requires-selection',
      })
    })

    it('returns visible: true when selection is required and present', () => {
      mockStore.resources = [
        {
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          requires: { selection: true },
          component: {},
        },
      ]
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
      vi.mocked(useViewModelStore.getState).mockReturnValue({
        getViewModel: vi.fn(() => ({
          selectedNodes: ['n1'],
          selectedEdges: [],
        })),
      } as any)

      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('P1')
      expectVisibility(result, { registered: true, visible: true })
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
      vi.mocked(useAppResourceStore.getState).mockReturnValue(mockStore as any)
      // AppStore: active, WorkspaceStore: has network (default mocks)

      const api = createResourceApi('app1')
      const result = api.getResourceVisibility('P1')
      expectVisibility(result, { registered: true, visible: true })
    })
  })

  // ── appId isolation ─────────────────────────────────────────────

  describe('appId isolation', () => {
    it('two factories with different appIds produce independent resourceIds', () => {
      const api1 = createResourceApi('app1')
      const api2 = createResourceApi('app2')

      const r1 = api1.registerPanel({ id: 'P1', component: DummyComponent })
      const r2 = api2.registerPanel({ id: 'P1', component: DummyComponent })

      expect(r1.success && r1.data.resourceId).toBe('app1::right-panel::P1')
      expect(r2.success && r2.data.resourceId).toBe('app2::right-panel::P1')
    })

    it('unregisterAll only affects the bound appId', () => {
      const api = createResourceApi('app1')
      api.unregisterAll()

      expect(mockStore.removeAllByAppId).toHaveBeenCalledWith('app1')
    })

    it('openModal resolves the id against the bound appId only', () => {
      mockStore.hasResource.mockImplementation(
        (appId: string) => appId === 'app1',
      )
      const api1 = createResourceApi('app1')
      const api2 = createResourceApi('app2')

      expect(api1.openModal('D1').success).toBe(true)
      expect(api2.openModal('D1').success).toBe(false)
      expect(mockModalStore.openModal).toHaveBeenCalledTimes(1)
      expect(mockModalStore.openModal).toHaveBeenCalledWith('app1', 'D1')
    })
  })
})
