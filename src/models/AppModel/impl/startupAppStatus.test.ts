// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { AppStatus } from '../AppStatus'
import { startupAppStatus } from './startupAppStatus'

describe('startupAppStatus', () => {
  describe('a core app (listed in the deployment’s own apps.json)', () => {
    it('starts on when the workspace has no record of it', () => {
      // First start, a new workspace, or an app added to apps.json since the
      // workspace was last opened: nobody has turned it off.
      expect(startupAppStatus(undefined, true)).toBe(AppStatus.Active)
    })

    it('stays off when the workspace records that the user turned it off', () => {
      expect(startupAppStatus(AppStatus.Inactive, true)).toBe(
        AppStatus.Inactive,
      )
    })

    it('starts on when the record says active', () => {
      expect(startupAppStatus(AppStatus.Active, true)).toBe(AppStatus.Active)
    })

    it('tries again when the record says an earlier load failed', () => {
      // `error` is what a failed activation left behind, not a choice the user
      // made, so only `inactive` keeps a core app off.
      expect(startupAppStatus(AppStatus.Error, true)).toBe(AppStatus.Active)
    })
  })

  describe('any other app', () => {
    it('has no status to start with when there is no record', () => {
      // Not seeded and not loaded: it is listed in App Manager, turned off.
      expect(startupAppStatus(undefined, false)).toBeUndefined()
    })

    it('starts with the status its record holds', () => {
      expect(startupAppStatus(AppStatus.Active, false)).toBe(AppStatus.Active)
      expect(startupAppStatus(AppStatus.Inactive, false)).toBe(
        AppStatus.Inactive,
      )
      expect(startupAppStatus(AppStatus.Error, false)).toBe(AppStatus.Error)
    })
  })
})
