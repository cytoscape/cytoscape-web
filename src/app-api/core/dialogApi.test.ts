// @vitest-environment node
// src/app-api/core/dialogApi.test.ts
//
// Plain tests for the per-app DialogApi factory. Mocks AppDialogStore (the
// same style as resourceApi.test.ts mocks AppResourceStore).
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppDialogStore } from '../../data/hooks/stores/AppDialogStore'
import { createDialogApi } from './dialogApi'

vi.mock('../../data/hooks/stores/AppDialogStore', () => ({
  useAppDialogStore: { getState: vi.fn() },
}))

function makeMockDialogStore(
  dialogs: Array<{ appId: string; id: string }> = [],
) {
  return {
    dialogs,
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    closeAllByAppId: vi.fn(),
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

    it('passes maxWidth and fullWidth through to the store', () => {
      const api = createDialogApi('app1')
      api.open({
        title: 'My Dialog',
        render: noopRender,
        maxWidth: 'lg',
        fullWidth: true,
      })

      expect(mockStore.openDialog).toHaveBeenCalledWith(
        expect.objectContaining({ maxWidth: 'lg', fullWidth: true }),
      )
    })

    it.each([
      ['empty title', { title: '', render: noopRender }],
      ['whitespace-only title', { title: '   ', render: noopRender }],
      ['non-string title', { title: 42, render: noopRender }],
      ['render not a function', { title: 'T', render: 'nope' }],
      ['empty id', { id: '', title: 'T', render: noopRender }],
      ['bad maxWidth', { title: 'T', render: noopRender, maxWidth: 'huge' }],
      ['bad fullWidth', { title: 'T', render: noopRender, fullWidth: 'yes' }],
    ])('returns fail(InvalidInput) for %s', (_label, options) => {
      const api = createDialogApi('app1')
      const result = api.open(options as any)

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

    it('with no argument, closes the most recently opened dialog still open for this app', () => {
      mockStore = makeMockDialogStore([
        { appId: 'app1', id: 'D1' },
        { appId: 'app2', id: 'D9' },
        { appId: 'app1', id: 'D2' },
      ])
      vi.mocked(useAppDialogStore.getState).mockReturnValue(mockStore as any)
      const api = createDialogApi('app1')

      const result = api.close()

      expect(result.success).toBe(true)
      expect(mockStore.closeDialog).toHaveBeenCalledWith('app1', 'D2')
    })

    it('with no argument, ignores a dialog the user already closed through the host', () => {
      // open() happened, but the store no longer holds the entry — the
      // fallback must read the store, not remember the last opened id.
      const api = createDialogApi('app1')
      api.open({ id: 'D1', title: 'First', render: noopRender })

      const result = api.close()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockStore.closeDialog).not.toHaveBeenCalled()
    })

    it('returns fail(ResourceNotFound) with no argument when this app has nothing open', () => {
      mockStore = makeMockDialogStore([{ appId: 'app2', id: 'D1' }])
      vi.mocked(useAppDialogStore.getState).mockReturnValue(mockStore as any)
      const api = createDialogApi('app1')

      const result = api.close()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP7')
      }
      expect(mockStore.closeDialog).not.toHaveBeenCalled()
    })

    it('returns fail(InvalidInput) for a non-string dialogId', () => {
      const api = createDialogApi('app1')
      const result = api.close(42 as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('APP9')
      }
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

    it('close(id) always targets the calling app, never another app’s dialog', () => {
      mockStore = makeMockDialogStore([{ appId: 'app1', id: 'D1' }])
      vi.mocked(useAppDialogStore.getState).mockReturnValue(mockStore as any)

      createDialogApi('app2').close('D1')

      expect(mockStore.closeDialog).toHaveBeenCalledWith('app2', 'D1')
    })
  })
})
