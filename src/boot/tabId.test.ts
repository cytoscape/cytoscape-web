import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CYWEB_TAB_PREFIX, getTabId, resetTabIdForTesting } from './tabId'

describe('getTabId', () => {
  beforeEach(() => {
    resetTabIdForTesting()
    window.name = ''
  })

  afterEach(() => {
    resetTabIdForTesting()
    window.name = ''
  })

  it('mints a prefixed id and persists it to window.name', () => {
    const id = getTabId()

    expect(id.startsWith(`${CYWEB_TAB_PREFIX}-`)).toBe(true)
    expect(window.name).toBe(id)
  })

  it('returns the same id on repeated calls', () => {
    expect(getTabId()).toBe(getTabId())
  })

  it('reuses the id left in window.name by a previous page load', () => {
    // Simulates a reload: window.name survives, module state does not.
    window.name = `${CYWEB_TAB_PREFIX}-existing-id`
    resetTabIdForTesting()

    expect(getTabId()).toBe(`${CYWEB_TAB_PREFIX}-existing-id`)
  })

  it('ignores a window.name this app did not set', () => {
    window.name = 'some-other-frameworks-window-name'
    resetTabIdForTesting()

    const id = getTabId()

    expect(id).not.toBe('some-other-frameworks-window-name')
    expect(id.startsWith(`${CYWEB_TAB_PREFIX}-`)).toBe(true)
  })

  it('mints distinct ids for distinct tabs', () => {
    const first = getTabId()

    // A second tab starts with no window.name and no module state
    window.name = ''
    resetTabIdForTesting()
    const second = getTabId()

    expect(second).not.toBe(first)
  })
})
