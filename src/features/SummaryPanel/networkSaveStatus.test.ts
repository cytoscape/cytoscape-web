// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getSaveButtonState, getSaveMenuItemState } from './networkSaveStatus'

describe('getSaveButtonState (CW-488)', () => {
  it('shows the up-to-date state when there are no changes', () => {
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

  it('saves a copy of an unmodified local network when authenticated (#640)', () => {
    // Data > Save Copy to NDEx is always enabled for a local network; the
    // row's save entry must offer the same, changes or not.
    const state = getSaveButtonState({
      networkModified: false,
      isNdex: false,
      authenticated: true,
    })
    expect(state.upToDate).toBe(true)
    expect(state.action).toBe('copy')
  })

  it('prompts sign-in for an unmodified local network when not authenticated (#640)', () => {
    const state = getSaveButtonState({
      networkModified: false,
      isNdex: false,
      authenticated: false,
    })
    expect(state.upToDate).toBe(true)
    expect(state.action).toBe('signin')
  })

  it('offers nothing for an unmodified NDEx network, signed in or not', () => {
    for (const authenticated of [true, false]) {
      expect(
        getSaveButtonState({
          networkModified: false,
          isNdex: true,
          authenticated,
        }).action,
      ).toBe('none')
    }
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

describe('getSaveMenuItemState', () => {
  it('names the save action for an NDEx network', () => {
    const state = getSaveMenuItemState({
      saveAction: 'overwrite',
      isNdex: true,
      isCurrentNetwork: true,
    })
    expect(state).toEqual({
      label: 'Save to NDEx',
      hint: undefined,
      disabled: false,
    })
  })

  it('names the save action for a local network', () => {
    const state = getSaveMenuItemState({
      saveAction: 'copy',
      isNdex: false,
      isCurrentNetwork: true,
    })
    expect(state).toEqual({
      label: 'Save a Copy to NDEx',
      hint: undefined,
      disabled: false,
    })
  })

  it('keeps naming the save action while it is unavailable', () => {
    for (const isNdex of [true, false]) {
      const expected = isNdex ? 'Save to NDEx' : 'Save a Copy to NDEx'
      expect(
        getSaveMenuItemState({
          saveAction: 'none',
          isNdex,
          isCurrentNetwork: true,
        }).label,
      ).toBe(expected)
      expect(
        getSaveMenuItemState({
          saveAction: 'signin',
          isNdex,
          isCurrentNetwork: false,
        }).label,
      ).toBe(expected)
    }
  })

  it('disables an up-to-date network, explaining there is nothing to save', () => {
    const state = getSaveMenuItemState({
      saveAction: 'none',
      isNdex: true,
      isCurrentNetwork: true,
    })
    expect(state.hint).toBe('No unsaved changes')
    expect(state.disabled).toBe(true)
  })

  it('enables saving a copy of an unmodified local network (#640)', () => {
    const state = getSaveMenuItemState({
      saveAction: getSaveButtonState({
        networkModified: false,
        isNdex: false,
        authenticated: true,
      }).action,
      isNdex: false,
      isCurrentNetwork: true,
    })
    expect(state).toEqual({
      label: 'Save a Copy to NDEx',
      hint: undefined,
      disabled: false,
    })
  })

  it('asks an anonymous user to sign in for an unmodified local network (#640)', () => {
    const state = getSaveMenuItemState({
      saveAction: getSaveButtonState({
        networkModified: false,
        isNdex: false,
        authenticated: false,
      }).action,
      isNdex: false,
      isCurrentNetwork: true,
    })
    expect(state.hint).toBe('Sign in to save to NDEx')
    expect(state.disabled).toBe(true)
  })

  it('disables an anonymous user, asking them to sign in', () => {
    const state = getSaveMenuItemState({
      saveAction: 'signin',
      isNdex: false,
      isCurrentNetwork: true,
    })
    expect(state.hint).toBe('Sign in to save to NDEx')
    expect(state.disabled).toBe(true)
  })

  it('disables a network that is not the open one', () => {
    const state = getSaveMenuItemState({
      saveAction: 'copy',
      isNdex: false,
      isCurrentNetwork: false,
    })
    expect(state.hint).toBe('Open this network first')
    expect(state.disabled).toBe(true)
  })

  it('reports nothing to save ahead of sign-in and of opening the network', () => {
    const state = getSaveMenuItemState({
      saveAction: 'none',
      isNdex: true,
      isCurrentNetwork: false,
    })
    expect(state.hint).toBe('No unsaved changes')
  })

  it('reports sign-in ahead of opening the network', () => {
    const state = getSaveMenuItemState({
      saveAction: 'signin',
      isNdex: true,
      isCurrentNetwork: false,
    })
    expect(state.hint).toBe('Sign in to save to NDEx')
  })
})
