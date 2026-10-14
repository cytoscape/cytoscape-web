import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  CYWEB_TAB_PREFIX,
  getTabId,
  resetTabIdForTesting,
} from '@/data/tabState/tabId'

describe('getTabId', () => {
  beforeEach(() => {
    resetTabIdForTesting()
    window.name = ''
  })

  afterEach(() => {
    resetTabIdForTesting()
    window.name = ''
  })

  it('mints a prefixed id', () => {
    expect(getTabId().startsWith(`${CYWEB_TAB_PREFIX}-`)).toBe(true)
  })

  it('returns the same id on repeated calls', () => {
    expect(getTabId()).toBe(getTabId())
  })

  it('mints distinct ids for distinct documents', () => {
    const first = getTabId()

    // A second tab is a fresh module instance with no memoized id
    resetTabIdForTesting()

    expect(getTabId()).not.toBe(first)
  })

  it('does not write the sync id to window.name', () => {
    // window.name is script-writable by anything on the page and is copied by
    // "Duplicate tab". Storing the sync id there let a third party silently
    // change this tab's origin stamp, and let two live tabs share one id.
    getTabId()

    expect(window.name).toBe('')
  })

  it('ignores window.name entirely, even one this app looks like it set', () => {
    window.name = `${CYWEB_TAB_PREFIX}-someone-elses-id`
    resetTabIdForTesting()

    expect(getTabId()).not.toBe(`${CYWEB_TAB_PREFIX}-someone-elses-id`)
  })
})
