import { describe, expect, it } from 'vitest'

import { shouldReloadOnRefocus } from './syncTabsUtils'

describe('shouldReloadOnRefocus', () => {
  it('does not reload when no cross-tab timestamp has ever been recorded (CW-652)', () => {
    // Empty/never-saved tab: dbTimestamp is undefined. Previously `?? Date.now()`
    // made this always reload on refocus.
    expect(shouldReloadOnRefocus(undefined, 0, false)).toBe(false)
    expect(shouldReloadOnRefocus(undefined, 1_000, true)).toBe(false)
  })

  it('does not reload when the workspace has no networks (empty tab)', () => {
    // Even if another tab bumped the timestamp, an empty tab has nothing to resync.
    expect(shouldReloadOnRefocus(5_000, 1_000, false)).toBe(false)
  })

  it('reloads when another tab wrote after this tab was hidden', () => {
    expect(shouldReloadOnRefocus(5_000, 1_000, true)).toBe(true)
  })

  it('does not reload when the last cross-tab write predates this tab hiding', () => {
    expect(shouldReloadOnRefocus(1_000, 5_000, true)).toBe(false)
  })

  it('does not reload when timestamps are equal (no newer write)', () => {
    expect(shouldReloadOnRefocus(5_000, 5_000, true)).toBe(false)
  })
})
