import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getTabId, resetTabIdForTesting } from '@/data/tabState/tabId'
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

  it('seeds a fresh tab name from the sync id', () => {
    // Not a required invariant — just where the initial unique string comes from.
    expect(initializeTabManager()).toBe(getTabId())
  })

  it('leaves the sync id alone when window.name was set by someone else', () => {
    // The whole point of the split: cross-tab sync must not inherit a value any
    // script on the page can write. A reused or foreign window.name changes what
    // an external app can focus, and nothing about what the DB stamps.
    window.name = 'cyweb-someone-elses-handle'
    const syncId = getTabId()

    expect(initializeTabManager()).toBe('cyweb-someone-elses-handle')
    expect(getTabId()).toBe(syncId)
  })

  it('still returns an id when window.name cannot be written', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'name')
    Object.defineProperty(window, 'name', {
      configurable: true,
      get: () => {
        throw new Error('blocked')
      },
    })

    try {
      expect(initializeTabManager()).toBe(getTabId())
    } finally {
      if (descriptor !== undefined) {
        Object.defineProperty(window, 'name', descriptor)
      } else {
        // No original descriptor: the throwing getter installed above is the
        // only one there is, and leaving it breaks every later test in the
        // worker that touches window.name.
        delete (window as any).name
      }
    }
  })
})
