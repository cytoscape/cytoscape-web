// src/data/hooks/stores/AppResourceStore.spec.ts

import { enableMapSet } from 'immer'

import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { useAppResourceStore } from './AppResourceStore'

enableMapSet()

function makeResource(
  overrides: Partial<RegisteredAppResource> & {
    id: string
    appId: string
    slot: RegisteredAppResource['slot']
  },
): RegisteredAppResource {
  return {
    component: () => null,
    ...overrides,
  }
}

describe('AppResourceStore', () => {
  beforeEach(() => {
    useAppResourceStore.setState({ resources: [] })
  })

  describe('upsertResource', () => {
    it('inserts a resource on first call', () => {
      useAppResourceStore
        .getState()
        .upsertResource(
          makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
        )

      const { resources } = useAppResourceStore.getState()
      expect(resources).toHaveLength(1)
      expect(resources[0].id).toBe('P1')
      expect(resources[0].appId).toBe('app1')
      expect(resources[0].slot).toBe('right-panel')
    })

    it('replaces on second call with same identity triple', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          title: 'Old',
        }),
      )
      store.upsertResource(
        makeResource({
          id: 'P1',
          appId: 'app1',
          slot: 'right-panel',
          title: 'New',
        }),
      )

      const { resources } = useAppResourceStore.getState()
      expect(resources).toHaveLength(1)
      expect(resources[0].title).toBe('New')
    })

    it('does not replace when slot differs', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'X', appId: 'app1', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'X', appId: 'app1', slot: 'apps-menu' }),
      )

      expect(useAppResourceStore.getState().resources).toHaveLength(2)
    })

    it('does not replace when appId differs', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app2', slot: 'right-panel' }),
      )

      expect(useAppResourceStore.getState().resources).toHaveLength(2)
    })
  })

  describe('removeResource', () => {
    it('removes the correct resource by identity triple', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'P2', appId: 'app1', slot: 'right-panel' }),
      )

      useAppResourceStore.getState().removeResource('app1', 'right-panel', 'P1')

      const { resources } = useAppResourceStore.getState()
      expect(resources).toHaveLength(1)
      expect(resources[0].id).toBe('P2')
    })

    it('is a no-op when identity does not match', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
      )

      useAppResourceStore
        .getState()
        .removeResource('app1', 'right-panel', 'nonexistent')

      expect(useAppResourceStore.getState().resources).toHaveLength(1)
    })
  })

  describe('hasResource', () => {
    it('returns true when resource exists', () => {
      useAppResourceStore
        .getState()
        .upsertResource(
          makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
        )

      expect(
        useAppResourceStore.getState().hasResource('app1', 'right-panel', 'P1'),
      ).toBe(true)
    })

    it('returns false when resource does not exist', () => {
      expect(
        useAppResourceStore.getState().hasResource('app1', 'right-panel', 'P1'),
      ).toBe(false)
    })

    it('returns false when only appId differs', () => {
      useAppResourceStore
        .getState()
        .upsertResource(
          makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
        )

      expect(
        useAppResourceStore.getState().hasResource('app2', 'right-panel', 'P1'),
      ).toBe(false)
    })
  })

  describe('removeAllByAppId', () => {
    it('removes all resources for the specified appId', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'M1', appId: 'app1', slot: 'apps-menu' }),
      )
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app2', slot: 'right-panel' }),
      )

      useAppResourceStore.getState().removeAllByAppId('app1')

      const { resources } = useAppResourceStore.getState()
      expect(resources).toHaveLength(1)
      expect(resources[0].appId).toBe('app2')
    })

    it('does not affect resources from other apps', () => {
      const store = useAppResourceStore.getState()
      store.upsertResource(
        makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'P2', appId: 'app2', slot: 'right-panel' }),
      )
      store.upsertResource(
        makeResource({ id: 'P3', appId: 'app3', slot: 'apps-menu' }),
      )

      useAppResourceStore.getState().removeAllByAppId('app2')

      const { resources } = useAppResourceStore.getState()
      expect(resources).toHaveLength(2)
      expect(resources.map((r) => r.appId)).toEqual(['app1', 'app3'])
    })

    it('is a no-op when appId has no resources', () => {
      useAppResourceStore
        .getState()
        .upsertResource(
          makeResource({ id: 'P1', appId: 'app1', slot: 'right-panel' }),
        )

      useAppResourceStore.getState().removeAllByAppId('nonexistent')

      expect(useAppResourceStore.getState().resources).toHaveLength(1)
    })
  })
})
