import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTabNetworkId,
  resolveDisplayNetworkId,
  resolveInitialNetworkId,
  setTabNetworkId,
} from '@/data/tabState/tabNetwork'

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

  it('returns undefined if the shared currentNetworkId is not a member of the workspace (e.g. invalid/corrupted id)', () => {
    expect(resolveDisplayNetworkId(undefined, null, 'Z', networkIds)).toBe(
      undefined,
    )
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

  it('degrades quietly when sessionStorage throws', () => {
    // Privacy mode and sandboxed iframes both make this throw. It is a backstop
    // for the URL, so losing it must never surface to the user.
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError')
      },
    })

    try {
      expect(getTabNetworkId()).toBe(undefined)
      expect(() => setTabNetworkId('A')).not.toThrow()
      expect(() => setTabNetworkId('')).not.toThrow()
    } finally {
      if (original !== undefined) {
        Object.defineProperty(window, 'sessionStorage', original)
      } else {
        delete (window as any).sessionStorage
      }
    }
  })

  it('degrades quietly when the storage methods themselves throw', () => {
    // A quota-exceeded setItem is the common form: the getter works, the write
    // does not.
    const store = window.sessionStorage
    const getItem = vi.spyOn(store, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const setItem = vi.spyOn(store, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const removeItem = vi.spyOn(store, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    try {
      expect(getTabNetworkId()).toBe(undefined)
      expect(() => setTabNetworkId('A')).not.toThrow()
      expect(() => setTabNetworkId('')).not.toThrow()
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
      removeItem.mockRestore()
    }
  })
})

describe('resolveInitialNetworkId (CW-514)', () => {
  const networkIds = ['net-a', 'net-b']

  it('keeps the requested id when its import failed', () => {
    // The error banner must name the network the user actually asked for,
    // instead of the app quietly redirecting to an unrelated local network.
    expect(
      resolveInitialNetworkId('net-missing', null, 'net-a', networkIds, true),
    ).toBe('net-missing')
  })

  it('does not keep a failed id that was not requested via the URL', () => {
    expect(resolveInitialNetworkId('', null, 'net-a', networkIds, true)).toBe(
      'net-a',
    )
    expect(
      resolveInitialNetworkId(undefined, null, 'net-a', networkIds, true),
    ).toBe('net-a')
  })

  it('resolves normally when the import succeeded', () => {
    expect(
      resolveInitialNetworkId('net-b', null, 'net-a', networkIds, false),
    ).toBe('net-b')
  })

  it('prefers this tab sessionStorage backstop over the shared field', () => {
    expect(
      resolveInitialNetworkId(undefined, 'net-b', 'net-a', networkIds, false),
    ).toBe('net-b')
  })

  it('returns empty string when the workspace has no networks', () => {
    expect(resolveInitialNetworkId(undefined, null, '', [], false)).toBe('')
  })

  /**
   * Regression: a fresh tab used to fall back to the shared `currentNetworkId`.
   * That field is no longer persisted (it is per-tab now), so the shared row
   * always reports '' and every new tab landed on "No network selected" despite
   * having networks. Caught by the two-tab e2e suite.
   */
  it('opens the first workspace network when there is no per-tab signal', () => {
    expect(
      resolveInitialNetworkId(undefined, null, '', networkIds, false),
    ).toBe('net-a')
  })

  it('still prefers a per-tab signal over the first-network fallback', () => {
    expect(
      resolveInitialNetworkId(undefined, 'net-b', '', networkIds, false),
    ).toBe('net-b')
    expect(resolveInitialNetworkId('net-b', null, '', networkIds, false)).toBe(
      'net-b',
    )
  })

  it('ignores a stale url id that is not in the workspace', () => {
    expect(
      resolveInitialNetworkId('net-gone', null, 'net-a', networkIds, false),
    ).toBe('net-a')
  })
})
