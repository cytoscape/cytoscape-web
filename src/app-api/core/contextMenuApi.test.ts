// src/app-api/core/contextMenuApi.test.ts
// Plain Jest tests for contextMenuApi core — no renderHook, no React context.

import { ApiErrorCode } from '../types/ApiResult'
import { contextMenuApi } from './contextMenuApi'

// ── Mock store ────────────────────────────────────────────────────────────────

const mockItems: any[] = []
const mockContextMenuItemActions = {
  addItem: jest.fn((item) => mockItems.push(item)),
  removeItem: jest.fn((itemId) => {
    const idx = mockItems.findIndex((i) => i.itemId === itemId)
    if (idx !== -1) mockItems.splice(idx, 1)
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
  // Re-bind mocks after clearAllMocks
  mockContextMenuItemActions.addItem.mockImplementation((item) =>
    mockItems.push(item),
  )
  mockContextMenuItemActions.removeItem.mockImplementation((itemId) => {
    const idx = mockItems.findIndex((i) => i.itemId === itemId)
    if (idx !== -1) mockItems.splice(idx, 1)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('contextMenuApi', () => {
  beforeEach(() => {
    resetMocks()
  })

  // ── addContextMenuItem ────────────────────────────────────────────────────

  describe('addContextMenuItem', () => {
    it('returns ok({ itemId }) with a non-empty UUID', () => {
      const result = contextMenuApi.addContextMenuItem({
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
      const result = contextMenuApi.addContextMenuItem({
        label: '',
        handler: jest.fn(),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('returns fail(InvalidInput) when label is whitespace only', () => {
      const result = contextMenuApi.addContextMenuItem({
        label: '   ',
        handler: jest.fn(),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.InvalidInput)
      }
    })

    it('defaults targetTypes to ["node", "edge"] when omitted', () => {
      const result = contextMenuApi.addContextMenuItem({
        label: 'My Item',
        handler: jest.fn(),
      })
      expect(result.success).toBe(true)
      expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ targetTypes: ['node', 'edge'] }),
      )
    })

    it('preserves explicitly provided targetTypes', () => {
      contextMenuApi.addContextMenuItem({
        label: 'Canvas Only',
        targetTypes: ['canvas'],
        handler: jest.fn(),
      })
      expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ targetTypes: ['canvas'] }),
      )
    })

    it('trims label before storing', () => {
      contextMenuApi.addContextMenuItem({
        label: '  My Item  ',
        handler: jest.fn(),
      })
      expect(mockContextMenuItemActions.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'My Item' }),
      )
    })

    it('calls addItem on the store', () => {
      contextMenuApi.addContextMenuItem({ label: 'Test', handler: jest.fn() })
      expect(mockContextMenuItemActions.addItem).toHaveBeenCalledTimes(1)
    })
  })

  // ── removeContextMenuItem ─────────────────────────────────────────────────

  describe('removeContextMenuItem', () => {
    it('returns ok() when item exists', () => {
      const addResult = contextMenuApi.addContextMenuItem({
        label: 'My Item',
        handler: jest.fn(),
      })
      if (!addResult.success) throw new Error('setup failed')
      const { itemId } = addResult.data

      const removeResult = contextMenuApi.removeContextMenuItem(itemId)
      expect(removeResult.success).toBe(true)
    })

    it('calls removeItem on the store when item exists', () => {
      const addResult = contextMenuApi.addContextMenuItem({
        label: 'My Item',
        handler: jest.fn(),
      })
      if (!addResult.success) throw new Error('setup failed')
      const { itemId } = addResult.data

      jest.clearAllMocks()
      contextMenuApi.removeContextMenuItem(itemId)
      expect(mockContextMenuItemActions.removeItem).toHaveBeenCalledWith(itemId)
    })

    it('returns fail(ContextMenuItemNotFound) for unknown itemId', () => {
      const result = contextMenuApi.removeContextMenuItem('nonexistent-id')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ApiErrorCode.ContextMenuItemNotFound)
      }
    })

    it('does not call removeItem when item is not found', () => {
      contextMenuApi.removeContextMenuItem('nonexistent-id')
      expect(mockContextMenuItemActions.removeItem).not.toHaveBeenCalled()
    })
  })
})
