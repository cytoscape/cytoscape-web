// src/app-api/core/dialogApi.test.ts
//
// Plain Jest/Vitest tests for the per-app DialogApi factory.
// Mocks AppDialogStore (same style as resourceApi.test.ts mocks
// AppResourceStore).
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import { createDialogApi } from './dialogApi'

vi.mock('../../data/hooks/stores/AppDialogStore', () => ({
  useAppDialogStore: { getState: vi.fn() },
}))

function makeMockDialogStore(
  overrides: Partial<{
    dialogs: any[]
    openDialog: import('vitest').Mock
    closeDialog: import('vitest').Mock
    closeAllForApp: import('vitest').Mock
  }> = {},
) {
  return {
    dialogs: [],
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    closeAllForApp: vi.fn(),
    ...overrides,
  }
}

const noopRender = () => null

describe('createDialogApi', () => {
  let mockStore: ReturnType<typeof makeMockDialogStore>

  beforeEach(() => {
    mockStore = makeMockDialogStore()
    vi.mocked(useAppDialogStore.getState).mockReturnValue(mockStore as any)
  })

  // ── open ──────────────────────────────────────────────────────────

  describe('open', () => {
    it('returns ok with a generated dialogId and calls openDialog with the bound appId', () => {
      const api = createDialogApi('app1')
      const result = api.open({ title: 'My Dialog', render: noopRender })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.dialogId).toBe('string')
        expect(result.data.dialogId.length).toBeGreaterThan(0)
      }
      expect(mockStore.openDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: 'app1',
          title: 'My Dialog',
          render: noopRender,
        }),
      )
    })

    it('uses the caller-supplied id instead of generating one', () => {
      const api = createDialogApi('app1')
      const result = api.open({
        id: 'my-id',
        title: 'My Dialog',
        render: noopRender,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dialogId).toBe('my-id')
      }
      expect(mockStore.openDialog).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-id' }),
      )
    })

    it('passes maxWidth and disableClose through to the store', () => {
      const api = createDialogApi('app1')
      api.open({
        title: 'My Dialog',
        render: noopRender,
        maxWidth: 'lg',
        disableClose: true,
      })

      expect(mockStore.openDialog).toHaveBeenCalledWith(
        expect.objectContaining({ maxWidth: 'lg', disableClose: true }),
      )
    })

    it('returns fail(InvalidInput) for empty title', () => {
      const api = createDialogApi('app1')
      const result = api.open({ title: '', render: noopRender })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.openDialog).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for whitespace-only title', () => {
      const api = createDialogApi('app1')
      const result = api.open({ title: '   ', render: noopRender })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
    })

    it('returns fail(InvalidInput) when render is not a function', () => {
      const api = createDialogApi('app1')
      const result = api.open({
        title: 'My Dialog',
        render: 'not-a-function' as any,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
      expect(mockStore.openDialog).not.toHaveBeenCalled()
    })

    it('upserts on second call with the same id (no error)', () => {
      const api = createDialogApi('app1')
      api.open({ id: 'D1', title: 'Old', render: noopRender })
      const result = api.open({ id: 'D1', title: 'New', render: noopRender })

      expect(result.success).toBe(true)
      expect(mockStore.openDialog).toHaveBeenCalledTimes(2)
      expect(mockStore.openDialog).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'D1', title: 'New' }),
      )
    })
  })

  // ── close ─────────────────────────────────────────────────────────

  describe('close', () => {
    it('closes the given dialogId with the bound appId', () => {
      const api = createDialogApi('app1')
      const result = api.close('D1')

      expect(result.success).toBe(true)
      expect(mockStore.closeDialog).toHaveBeenCalledWith('app1', 'D1')
    })

    it('with no argument, closes the most recently opened dialog from this app', () => {
      const api = createDialogApi('app1')
      api.open({ id: 'D1', title: 'First', render: noopRender })
      api.open({ id: 'D2', title: 'Second', render: noopRender })

      const result = api.close()

      expect(result.success).toBe(true)
      expect(mockStore.closeDialog).toHaveBeenCalledWith('app1', 'D2')
    })

    it('returns fail(ResourceNotFound) with no argument when nothing has been opened', () => {
      const api = createDialogApi('app1')
      const result = api.close()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockStore.closeDialog).not.toHaveBeenCalled()
    })
  })

  // ── appId isolation ───────────────────────────────────────────────

  describe('appId isolation', () => {
    it('two factories bind independent appIds', () => {
      const api1 = createDialogApi('app1')
      const api2 = createDialogApi('app2')

      api1.open({ id: 'D1', title: 'App1 dialog', render: noopRender })
      api2.open({ id: 'D1', title: 'App2 dialog', render: noopRender })

      expect(mockStore.openDialog).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ appId: 'app1', id: 'D1' }),
      )
      expect(mockStore.openDialog).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ appId: 'app2', id: 'D1' }),
      )
    })

    it("close() with no argument only ever targets its own factory's last id", () => {
      const api1 = createDialogApi('app1')
      const api2 = createDialogApi('app2')

      api1.open({ id: 'D1', title: 'App1 dialog', render: noopRender })
      api2.close()

      // app2's factory never opened anything, so it has no "last id" to fall
      // back to — it must not accidentally reuse app1's.
      expect(mockStore.closeDialog).not.toHaveBeenCalled()
    })
  })
})
