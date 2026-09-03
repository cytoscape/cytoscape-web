// @vitest-environment node
// src/data/hooks/stores/AppDialogStore.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'

import type { RegisteredAppDialog } from '../../../models/AppModel/RegisteredAppDialog'
import { cleanupAllForApp } from './AppCleanupRegistry'
import { useAppDialogStore } from './AppDialogStore'

function makeDialog(
  overrides: Partial<RegisteredAppDialog> & { id: string; appId: string },
): RegisteredAppDialog {
  return {
    title: 'A Dialog',
    render: () => null,
    ...overrides,
  }
}

describe('AppDialogStore', () => {
  beforeEach(() => {
    useAppDialogStore.setState({ dialogs: [] })
  })

  describe('openDialog', () => {
    it('inserts a dialog on first call', () => {
      useAppDialogStore
        .getState()
        .openDialog(makeDialog({ id: 'D1', appId: 'app1' }))

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].id).toBe('D1')
      expect(dialogs[0].appId).toBe('app1')
    })

    it('replaces in place on a second call with the same (appId, id)', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1', title: 'Old' }))
      store.openDialog(makeDialog({ id: 'D2', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1', title: 'New' }))

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs.map((d) => d.id)).toEqual(['D1', 'D2'])
      expect(dialogs[0].title).toBe('New')
    })

    it('does not replace when id differs', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D2', appId: 'app1' }))

      expect(useAppDialogStore.getState().dialogs).toHaveLength(2)
    })

    it('does not replace when appId differs', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app2' }))

      expect(useAppDialogStore.getState().dialogs).toHaveLength(2)
    })

    it('keeps the render closure exactly as passed (no Immer freeze/proxy)', () => {
      const render = () => null
      useAppDialogStore
        .getState()
        .openDialog(makeDialog({ id: 'D1', appId: 'app1', render }))

      expect(useAppDialogStore.getState().dialogs[0].render).toBe(render)
    })
  })

  describe('closeDialog', () => {
    it('removes the correct dialog by (appId, id)', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D2', appId: 'app1' }))

      useAppDialogStore.getState().closeDialog('app1', 'D1')

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].id).toBe('D2')
    })

    it('is a no-op when the identity does not match', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))

      useAppDialogStore.getState().closeDialog('app1', 'nonexistent')

      expect(useAppDialogStore.getState().dialogs).toHaveLength(1)
    })

    it('does not close another app’s dialog with the same id', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app2' }))

      useAppDialogStore.getState().closeDialog('app1', 'D1')

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].appId).toBe('app2')
    })
  })

  describe('closeAllByAppId', () => {
    it('removes all dialogs for the specified appId', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D2', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app2' }))

      useAppDialogStore.getState().closeAllByAppId('app1')

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].appId).toBe('app2')
    })

    it('is a no-op when the appId has no dialogs', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))

      useAppDialogStore.getState().closeAllByAppId('nonexistent')

      expect(useAppDialogStore.getState().dialogs).toHaveLength(1)
    })
  })

  describe('app cleanup', () => {
    it('closes the app’s dialogs when the lifecycle runs cleanupAllForApp', () => {
      // The registration happens at module load; deactivating an app must
      // take its dialogs down without appLifecycle knowing this store.
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app2' }))

      cleanupAllForApp('app1')

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].appId).toBe('app2')
    })
  })
})
