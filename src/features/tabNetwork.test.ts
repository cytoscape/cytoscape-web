import { beforeEach, describe, expect, it } from 'vitest'

import {
  getTabNetworkId,
  resolveDisplayNetworkId,
  setTabNetworkId,
} from './tabNetwork'

describe('resolveDisplayNetworkId (CW-722)', () => {
  const networkIds = ['A', 'B', 'C']

  it('prefers the URL network id when it is a member of the workspace', () => {
    // The scenario from the ticket: shared currentNetworkId is B (another tab
    // switched to it) but this tab is showing A per its own URL.
    expect(resolveDisplayNetworkId('A', null, 'B', networkIds)).toBe('A')
  })

  it('falls back to the sessionStorage backstop when the URL has no network', () => {
    expect(resolveDisplayNetworkId(undefined, 'A', 'B', networkIds)).toBe('A')
    expect(resolveDisplayNetworkId('', 'A', 'B', networkIds)).toBe('A')
  })

  it('ignores a URL network id that is no longer in the workspace', () => {
    // Network was removed in another tab; do not try to display it.
    expect(resolveDisplayNetworkId('Z', 'B', 'C', networkIds)).toBe('B')
  })

  it('ignores a stale sessionStorage id that is no longer in the workspace', () => {
    expect(resolveDisplayNetworkId(undefined, 'Z', 'C', networkIds)).toBe('C')
  })

  it('falls back to the shared currentNetworkId as a last resort', () => {
    expect(resolveDisplayNetworkId(undefined, null, 'C', networkIds)).toBe('C')
  })

  it('returns the shared id as-is even when not a member (empty workspace)', () => {
    expect(resolveDisplayNetworkId(undefined, null, '', [])).toBe('')
    expect(resolveDisplayNetworkId('A', 'B', undefined, [])).toBe(undefined)
  })
})

describe('getTabNetworkId / setTabNetworkId', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('round-trips a network id through sessionStorage', () => {
    expect(getTabNetworkId()).toBe(undefined)
    setTabNetworkId('A')
    expect(getTabNetworkId()).toBe('A')
  })

  it('clears the stored id when set to empty string', () => {
    setTabNetworkId('A')
    setTabNetworkId('')
    expect(getTabNetworkId()).toBe(undefined)
  })
})
