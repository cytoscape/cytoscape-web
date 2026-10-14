// @vitest-environment node
// src/data/hooks/stores/ModalLauncherStore.spec.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { cleanupAllForApp } from './AppCleanupRegistry'
import { useModalLauncherStore } from './ModalLauncherStore'

describe('ModalLauncherStore', () => {
  beforeEach(() => {
    useModalLauncherStore.setState({ openModals: [] })
  })

  describe('openModal', () => {
    it('appends open modals in opening order', () => {
      const store = useModalLauncherStore.getState()
      store.openModal('app1', 'D1')
      store.openModal('app2', 'D2')

      expect(useModalLauncherStore.getState().openModals).toEqual([
        { appId: 'app1', id: 'D1' },
        { appId: 'app2', id: 'D2' },
      ])
    })

    it('is idempotent — opening an already-open modal adds no duplicate', () => {
      const store = useModalLauncherStore.getState()
      store.openModal('app1', 'D1')
      store.openModal('app1', 'D1')

      expect(useModalLauncherStore.getState().openModals).toHaveLength(1)
    })

    it('treats the same id under different appIds as distinct modals', () => {
      const store = useModalLauncherStore.getState()
      store.openModal('app1', 'D1')
      store.openModal('app2', 'D1')

      expect(useModalLauncherStore.getState().openModals).toHaveLength(2)
    })
  })

  describe('closeModal', () => {
    it('removes only the matching (appId, id) entry', () => {
      const store = useModalLauncherStore.getState()
      store.openModal('app1', 'D1')
      store.openModal('app1', 'D2')
      store.openModal('app2', 'D1')

      useModalLauncherStore.getState().closeModal('app1', 'D1')

      expect(useModalLauncherStore.getState().openModals).toEqual([
        { appId: 'app1', id: 'D2' },
        { appId: 'app2', id: 'D1' },
      ])
    })

    it('is a no-op when the modal is not open', () => {
      useModalLauncherStore.getState().openModal('app1', 'D1')

      useModalLauncherStore.getState().closeModal('app1', 'ghost')

      expect(useModalLauncherStore.getState().openModals).toHaveLength(1)
    })
  })

  describe('closeAllByAppId', () => {
    it('closes only the given app’s modals', () => {
      const store = useModalLauncherStore.getState()
      store.openModal('app1', 'D1')
      store.openModal('app2', 'D1')
      store.openModal('app1', 'D2')

      useModalLauncherStore.getState().closeAllByAppId('app1')

      expect(useModalLauncherStore.getState().openModals).toEqual([
        { appId: 'app2', id: 'D1' },
      ])
    })

    it('is a no-op when the app has no open modals', () => {
      useModalLauncherStore.getState().openModal('app1', 'D1')

      useModalLauncherStore.getState().closeAllByAppId('nonexistent')

      expect(useModalLauncherStore.getState().openModals).toHaveLength(1)
    })
  })

  // The store registers itself with the AppCleanupRegistry at module load,
  // so appLifecycle's single cleanup entry point must close its modals too.
  it('cleanupAllForApp (app lifecycle) closes the unmounted app’s modals', () => {
    const store = useModalLauncherStore.getState()
    store.openModal('app1', 'D1')
    store.openModal('app2', 'D1')

    cleanupAllForApp('app1')

    expect(useModalLauncherStore.getState().openModals).toEqual([
      { appId: 'app2', id: 'D1' },
    ])
  })
})
