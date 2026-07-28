import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getTabId, resetTabIdForTesting } from './tabId'
import { initializeTabManager } from './tabManager'

// Minting and uniqueness are `tabId`'s contract and are covered in
// tabId.test.ts; this file covers what boot promises an external app: the id it
// returns is the one published on window.name.
const CYWEB_TAB_ID = /^cyweb-\d+-[a-z0-9]{1,6}$/

beforeEach(() => {
  resetTabIdForTesting()
  window.name = ''
})

afterEach(() => {
  resetTabIdForTesting()
  window.name = ''
})

describe('initializeTabManager', () => {
  it('assigns a cyweb-prefixed id and publishes it on window.name', () => {
    const tabId = initializeTabManager()

    expect(tabId).toMatch(CYWEB_TAB_ID)
    expect(window.name).toBe(tabId)
  })

  it('reuses an existing id so a reload keeps the tab addressable', () => {
    // An external app may be holding this id as a window.open target.
    window.name = 'cyweb-1234567890'

    expect(initializeTabManager()).toBe('cyweb-1234567890')
  })

  it('replaces a window.name this app did not set', () => {
    window.name = 'some-other-apps-window'

    expect(initializeTabManager()).toMatch(CYWEB_TAB_ID)
  })

  it('reports the same id the database layer stamps on its writes', () => {
    // Cross-tab sync drops changes whose source is this tab's id, so the boot
    // announcement and the id the DB stamps must not diverge.
    expect(initializeTabManager()).toBe(getTabId())
  })
})
