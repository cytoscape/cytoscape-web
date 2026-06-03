// src/app-api/core/contextMenuApi.test.ts
// Plain Jest tests for contextMenuApi — factory + anonymous singleton patterns.

import { ApiErrorCode } from '../types/ApiResult'
import { contextMenuApi, createContextMenuApi } from './contextMenuApi'

// ── Mock store ────────────────────────────────────────────────────────────────

const mockItems: any[] = []
const mockContextMenuItemActions = {
  addItem: jest.fn((item) => mockItems.push(item)),
  removeItem: jest.fn((itemId) => {
    const idx = mockItems.findIndex((i) => i.itemId === itemId)
    if (idx !== -1) mockItems.splice(idx, 1)
  }),
  removeAllByAppId: jest.fn((appId) => {
    const filtered = mockItems.filter(
      (i) => i.appId === undefined || i.appId !== appId,
    )
    mockItems.length = 0
    mockItems.push(...filtered)
  }),
}

jest.mock('../../data/hooks/stores/ContextMenuItemStore', () => ({
  useContextMenuItemStore: {
    getState: jest.fn(() => ({
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
  jest.clearAllMocks()
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
    api.addContextMenuItem({ label: 'Test', handler: jest.fn() })

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBe('app1')
  })

  it('returns ok({ itemId }) with a non-empty UUID', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: 'My Item',
      handler: jest.fn(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(typeof result.data.itemId).toBe('string')
      expect(result.data.itemId.length).toBeGreaterThan(0)
    }
  })

  it('returns fail(InvalidInput) when label is empty string', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({ label: '', handler: jest.fn() })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('returns fail(InvalidInput) when label is whitespace only', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: '   ',
      handler: jest.fn(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })

  it('defaults targetTypes to ["node", "edge"] when omitted', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: 'My Item', handler: jest.fn() })

    expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ targetTypes: ['node', 'edge'] }),
    )
  })

  it('trims label before storing', () => {
    const api = createContextMenuApi('app1')
    api.addContextMenuItem({ label: '  My Item  ', handler: jest.fn() })

    expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'My Item' }),
    )
  })

  it('removeContextMenuItem works for factory-registered items', () => {
    const api = createContextMenuApi('app1')
    const result = api.addContextMenuItem({
      label: 'Test',
      handler: jest.fn(),
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
      expect(result.error.code).toBe(ApiErrorCode.ContextMenuItemNotFound)
    }
  })
})

// ── Tests: contextMenuApi (anonymous singleton) ──────────────────────────────

describe('contextMenuApi (anonymous singleton)', () => {
  beforeEach(() => resetMocks())

  it('stores no appId on registered items (undefined)', () => {
    contextMenuApi.addContextMenuItem({ label: 'Test', handler: jest.fn() })

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBeUndefined()
  })

  it('returns ok({ itemId }) with a non-empty UUID', () => {
    const result = contextMenuApi.addContextMenuItem({
      label: 'My Item',
      handler: jest.fn(),
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.itemId.length).toBeGreaterThan(0)
    }
  })

  it('validation semantics are preserved (empty label fails)', () => {
    const result = contextMenuApi.addContextMenuItem({
      label: '',
      handler: jest.fn(),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
    }
  })
})

// ── Tests: removeAllByAppId behavior ─────────────────────────────────────────

describe('removeAllByAppId interaction', () => {
  beforeEach(() => resetMocks())

  it('removeAllByAppId removes only items with matching appId', () => {
    const api1 = createContextMenuApi('app1')
    const api2 = createContextMenuApi('app2')
    api1.addContextMenuItem({ label: 'A', handler: jest.fn() })
    api2.addContextMenuItem({ label: 'B', handler: jest.fn() })
    contextMenuApi.addContextMenuItem({ label: 'C', handler: jest.fn() }) // anonymous

    mockContextMenuItemActions.removeAllByAppId('app1')

    const ids = mockItems.map((i) => i.appId)
    expect(ids).toEqual(['app2', undefined]) // anonymous item survives
  })

  it('removeAllByAppId does not remove anonymous items', () => {
    contextMenuApi.addContextMenuItem({ label: 'Anon', handler: jest.fn() })

    mockContextMenuItemActions.removeAllByAppId('app1')

    expect(mockItems).toHaveLength(1)
    expect(mockItems[0].appId).toBeUndefined()
  })
})
