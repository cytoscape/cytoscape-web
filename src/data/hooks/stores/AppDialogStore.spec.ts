// src/data/hooks/stores/AppDialogStore.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'

import type { RegisteredAppDialog } from '../../../models/AppModel/RegisteredAppDialog'
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

    it('replaces on second call with the same (appId, id)', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1', title: 'Old' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1', title: 'New' }))

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
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

  describe('closeAllForApp', () => {
    it('removes all dialogs for the specified appId', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D2', appId: 'app1' }))
      store.openDialog(makeDialog({ id: 'D1', appId: 'app2' }))

      useAppDialogStore.getState().closeAllForApp('app1')

      const { dialogs } = useAppDialogStore.getState()
      expect(dialogs).toHaveLength(1)
      expect(dialogs[0].appId).toBe('app2')
    })

    it('is a no-op when the appId has no dialogs', () => {
      const store = useAppDialogStore.getState()
      store.openDialog(makeDialog({ id: 'D1', appId: 'app1' }))

      useAppDialogStore.getState().closeAllForApp('nonexistent')

      expect(useAppDialogStore.getState().dialogs).toHaveLength(1)
    })
  })
})
