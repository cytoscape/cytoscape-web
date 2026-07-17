import { describe, expect, it } from 'vitest'

import { getSaveButtonState } from './networkSaveStatus'

describe('getSaveButtonState (CW-488)', () => {
  it('shows the up-to-date state (green check) when there are no changes', () => {
    const state = getSaveButtonState({
      networkModified: false,
      isNdex: true,
      authenticated: true,
    })
    expect(state.upToDate).toBe(true)
    expect(state.action).toBe('none')
  })

  it('prompts sign-in for a modified network when not authenticated', () => {
    const state = getSaveButtonState({
      networkModified: true,
      isNdex: true,
      authenticated: false,
    })
    expect(state.upToDate).toBe(false)
    expect(state.action).toBe('signin')
    expect(state.tooltip).toMatch(/sign in/i)
  })

  it('overwrites a modified NDEx network when authenticated', () => {
    const state = getSaveButtonState({
      networkModified: true,
      isNdex: true,
      authenticated: true,
    })
    expect(state.upToDate).toBe(false)
    expect(state.action).toBe('overwrite')
  })

  it('saves a copy of a modified local network when authenticated', () => {
    const state = getSaveButtonState({
      networkModified: true,
      isNdex: false,
      authenticated: true,
    })
    expect(state.upToDate).toBe(false)
    expect(state.action).toBe('copy')
  })
})
