import { beforeEach, describe, expect, it, vi } from 'vitest'

// src/app-api/core/contextMenuApi.test.ts
// Plain Jest tests for contextMenuApi — factory + anonymous singleton patterns.
import { AppCodes } from '../types/ApiResult'
import { contextMenuApi, createContextMenuApi } from './contextMenuApi'

// ── Mock store ────────────────────────────────────────────────────────────────

const mockItems: any[] = []
const mockContextMenuItemActions = {
  addItem: vi.fn((item) => mockItems.push(item)),
  removeItem: vi.fn((itemId) => {
    const idx = mockItems.findIndex((i) => i.itemId === itemId)
    if (idx !== -1) mockItems.splice(idx, 1)
  }),
  removeAllByAppId: vi.fn((appId) => {
    const filtered = mockItems.filter(
      (i) => i.appId === undefined || i.appId !== appId,
    )
    mockItems.length = 0
    mockItems.push(...filtered)
  }),
}

vi.mock('../../data/hooks/stores/ContextMenuItemStore', () => ({
  useContextMenuItemStore: {
    getState: vi.fn(() => ({
      ...mockContextMenuItemActions,
      get items() {
        return mockItems
      },
    })),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
  mockItems.length = 0
  vi.clearAllMocks()
  mockContextMenuItemActions.addItem.mockImplementation((item) =>
    mockItems.push(item),
  )
  mockContextMenuItemActions.removeItem.mockImplementation((itemId) => {
    const idx = mockItems.findIndex((i) => i.itemId === itemId)
    if (idx !== -1) mockItems.splice(idx, 1)
  })
  mockContextMenuItemActions.removeAllByAppId.mockImplementation((appId) => {
    const filtered = mockItems.filter(
      (i) => i.appId === undefined || i.appId !== appId,
    )
    mockItems.length = 0
    mockItems.push(...filtered)
  })
}

// ── Tests: createContextMenuApi (per-app factory) ────────────────────────────

describe('createContextMenuApi (per-app factory)', () => {
  beforeEach(() => resetMocks())

  it('stores appId on registered items', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: 'Test', handler: vi.fn() })

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBe('app1')
  })

  it('returns ok({ itemId }) with a non-empty UUID', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: 'My Item',
      handler: vi.fn(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(typeof result.data.itemId).toBe('string')
      expect(result.data.itemId.length).toBeGreaterThan(0)
    }
  })

  it('returns fail(InvalidInput) when label is empty string', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({ label: '', handler: vi.fn() })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('returns fail(InvalidInput) when label is whitespace only', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: '   ',
      handler: vi.fn(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('defaults targetTypes to ["node", "edge"] when omitted', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: 'My Item', handler: vi.fn() })

    expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ targetTypes: ['node', 'edge'] }),
    )
  })

  it('trims label before storing', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: '  My Item  ', handler: vi.fn() })

    expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'My Item' }),
    )
  })

  it('removeContextMenuItem works for factory-registered items', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: 'Test',
      handler: vi.fn(),
    })
    if (!result.success) throw new Error('setup failed')

    const removeResult = api.removeContextMenuItem(result.data.itemId)
    expect(removeResult.success).toBe(true)
    expect(mockItems).toHaveLength(0)
  })

  it('returns fail(ContextMenuItemNotFound) for unknown itemId', () => {
    const api = createContextMenuApi('app1')
    const result = api.removeContextMenuItem('nonexistent-id')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.CONTEXT_MENU_ITEM_NOT_FOUND.code)
    }
  })

  it('cannot remove an item owned by another app', () => {
    const app1 = createContextMenuApi('app1')
    const app2 = createContextMenuApi('app2')
    const created = app1.addContextMenuItem({ label: 'A', handler: vi.fn() })
    if (!created.success) throw new Error('setup failed')

    // app2 knows app1's itemId but must not be able to remove it
    const result = app2.removeContextMenuItem(created.data.itemId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.CONTEXT_MENU_ITEM_NOT_FOUND.code)
    }
    expect(mockItems).toHaveLength(1)
    expect(mockContextMenuItemActions.removeItem).not.toHaveBeenCalled()
  })

  it('cannot remove an anonymous item via the per-app factory', () => {
    const app1 = createContextMenuApi('app1')
    const created = contextMenuApi.addContextMenuItem({
      label: 'Anon',
      handler: vi.fn(),
    })
    if (!created.success) throw new Error('setup failed')

    const result = app1.removeContextMenuItem(created.data.itemId)

    expect(result.success).toBe(false)
    expect(mockItems).toHaveLength(1)
  })
})

// ── Tests: contextMenuApi (anonymous singleton) ──────────────────────────────

describe('contextMenuApi (anonymous singleton)', () => {
  beforeEach(() => resetMocks())

  it('stores no appId on registered items (undefined)', () => {
    contextMenuApi.addContextMenuItem({ label: 'Test', handler: vi.fn() })

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBeUndefined()
  })

  it('returns ok({ itemId }) with a non-empty UUID', () => {
    const result = contextMenuApi.addContextMenuItem({
      label: 'My Item',
      handler: vi.fn(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.itemId.length).toBeGreaterThan(0)
    }
  })

  it('validation semantics are preserved (empty label fails)', () => {
    const result = contextMenuApi.addContextMenuItem({
      label: '',
      handler: vi.fn(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(AppCodes.INVALID_INPUT.code)
    }
  })

  it('removes its own anonymous items', () => {
    const created = contextMenuApi.addContextMenuItem({
      label: 'Anon',
      handler: vi.fn(),
    })
    if (!created.success) throw new Error('setup failed')

    const result = contextMenuApi.removeContextMenuItem(created.data.itemId)
    expect(result.success).toBe(true)
    expect(mockItems).toHaveLength(0)
  })

  it('cannot remove an app-owned item', () => {
    const app1 = createContextMenuApi('app1')
    const created = app1.addContextMenuItem({ label: 'A', handler: vi.fn() })
    if (!created.success) throw new Error('setup failed')

    const result = contextMenuApi.removeContextMenuItem(created.data.itemId)
    expect(result.success).toBe(false)
    expect(mockItems).toHaveLength(1)
  })
})

// ── Tests: removeAllByAppId behavior ─────────────────────────────────────────

describe('removeAllByAppId interaction', () => {
  beforeEach(() => resetMocks())

  it('removeAllByAppId removes only items with matching appId', () => {
    const api1 = createContextMenuApi('app1')
    const api2 = createContextMenuApi('app2')
    api1.addContextMenuItem({ label: 'A', handler: vi.fn() })
    api2.addContextMenuItem({ label: 'B', handler: vi.fn() })
    contextMenuApi.addContextMenuItem({ label: 'C', handler: vi.fn() }) // anonymous

    mockContextMenuItemActions.removeAllByAppId('app1')

    const ids = mockItems.map((i) => i.appId)
    expect(ids).toEqual(['app2', undefined]) // anonymous item survives
  })

  it('removeAllByAppId does not remove anonymous items', () => {
    contextMenuApi.addContextMenuItem({ label: 'Anon', handler: vi.fn() })

    mockContextMenuItemActions.removeAllByAppId('app1')

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBeUndefined()
  })
})
