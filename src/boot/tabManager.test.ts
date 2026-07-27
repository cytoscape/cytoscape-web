import { afterEach, describe, expect, it } from 'vitest'

import { initializeTabManager } from './tabManager'

const CYWEB_TAB_ID = /^cyweb-[0-9a-f-]{36}$/

afterEach(() => {
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

  it('gives every tab a distinct id', () => {
    // The id used to be `cyweb-${Date.now()}`, so tabs initializing within the
    // same millisecond — a session restore reopening several at once — shared a
    // window.name, and window.open(url, tabId) could focus the wrong one.
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) {
      window.name = ''
      ids.add(initializeTabManager())
    }

    expect(ids.size).toBe(50)
  })
})
