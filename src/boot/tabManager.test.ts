import { afterEach, describe, expect, it } from 'vitest'

import { initializeTabManager } from './tabManager'

afterEach(() => {
  window.name = ''
})

describe('initializeTabManager', () => {
  it('assigns a cyweb-prefixed id and publishes it on window.name', () => {
    const tabId = initializeTabManager()

    expect(tabId).toMatch(/^cyweb-\d+$/)
    expect(window.name).toBe(tabId)
  })

  it('reuses an existing id so a reload keeps the tab addressable', () => {
    // An external app may be holding this id as a window.open target.
    window.name = 'cyweb-1234567890'

    expect(initializeTabManager()).toBe('cyweb-1234567890')
  })

  it('replaces a window.name this app did not set', () => {
    window.name = 'some-other-apps-window'

    expect(initializeTabManager()).toMatch(/^cyweb-\d+$/)
  })
})
