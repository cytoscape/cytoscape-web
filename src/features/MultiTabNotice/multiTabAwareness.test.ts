import { beforeEach, describe, expect, it } from 'vitest'

import {
  consumeCrossTabReloadFlag,
  dismissMultiTabNotice,
  flagCrossTabReload,
  isMultiTabNoticeDismissed,
} from './multiTabAwareness'

describe('multi-tab notice dismissal (localStorage)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('is not dismissed by default', () => {
    expect(isMultiTabNoticeDismissed()).toBe(false)
  })

  it('persists a permanent dismissal', () => {
    dismissMultiTabNotice()
    expect(isMultiTabNoticeDismissed()).toBe(true)
  })
})

describe('cross-tab reload flag (sessionStorage)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('returns false when no reload was flagged', () => {
    expect(consumeCrossTabReloadFlag()).toBe(false)
  })

  it('returns true exactly once after a reload is flagged', () => {
    flagCrossTabReload()
    expect(consumeCrossTabReloadFlag()).toBe(true)
    // Consumed — a second read must not re-notify.
    expect(consumeCrossTabReloadFlag()).toBe(false)
  })
})
