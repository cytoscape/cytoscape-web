// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  APP_API_VERSION,
  buildHostRemoteEntryUrl,
  publishHostDescriptor,
  type CyWebHostDescriptor,
} from './hostDescriptor'

// The descriptor is what a federated app reads to find this host. Two things
// can break it silently: a based deployment (urlBaseName is '/' in production,
// so no end-to-end run exercises the other branch) and a descriptor that is
// mutable after publication, which would promise remotes an update path the MF
// runtime cannot deliver.

const FILENAME = 'remoteEntry.js'

describe('buildHostRemoteEntryUrl', () => {
  it('resolves against the origin root when base is /', () => {
    expect(buildHostRemoteEntryUrl('/', 'https://h/y/z', FILENAME)).toBe(
      'https://h/remoteEntry.js',
    )
  })

  it('keeps the base path when the host is deployed under a subpath', () => {
    expect(
      buildHostRemoteEntryUrl('/cytoscape/', 'https://h/y/z', FILENAME),
    ).toBe('https://h/cytoscape/remoteEntry.js')
  })

  it('normalizes a base with no trailing slash', () => {
    // Vite does NOT guarantee one: measured, `base: '/cytoscape'` inlines
    // exactly "/cytoscape" into import.meta.env.BASE_URL. Concatenating that
    // would produce '/cytoscaperemoteEntry.js' — a URL that 404s on a based
    // deployment and cannot occur on a root one, so nothing else would catch it.
    expect(buildHostRemoteEntryUrl('/cytoscape', 'https://h/y/z', FILENAME)).toBe(
      'https://h/cytoscape/remoteEntry.js',
    )
  })

  it('produces an absolute URL from a relative page href', () => {
    // A remote resolves this URL from its own origin, so a relative result
    // would silently point at the REMOTE's server instead of the host's.
    const url = buildHostRemoteEntryUrl('/', 'https://h:5500/a/b?q=1', FILENAME)
    expect(new URL(url).protocol).toBe('https:')
    expect(url).toBe('https://h:5500/remoteEntry.js')
  })
})

describe('publishHostDescriptor', () => {
  const publish = (base = '/', href = 'https://h/y/z') => {
    const target: { __CYWEB_HOST__?: CyWebHostDescriptor } = {}
    publishHostDescriptor(target, base, href)
    return target
  }

  it('publishes name, remoteEntry and apiVersion', () => {
    expect(publish('/cytoscape/').__CYWEB_HOST__).toEqual({
      name: 'cyweb',
      remoteEntry: 'https://h/cytoscape/remoteEntry.js',
      apiVersion: APP_API_VERSION,
    })
  })

  it('freezes the descriptor value', () => {
    const descriptor = publish().__CYWEB_HOST__
    expect(Object.isFrozen(descriptor)).toBe(true)
  })

  it('installs a non-writable, non-configurable property', () => {
    const target = publish()
    expect(
      Object.getOwnPropertyDescriptor(target, '__CYWEB_HOST__'),
    ).toMatchObject({ writable: false, configurable: false })
  })

  it('cannot be replaced or deleted after publication', () => {
    const target = publish()
    const original = target.__CYWEB_HOST__

    // Non-strict assignment and delete both fail silently rather than throwing,
    // which is exactly why this is asserted rather than assumed.
    expect(() => {
      Reflect.set(target, '__CYWEB_HOST__', { name: 'evil' })
    }).not.toThrow()
    expect(Reflect.deleteProperty(target, '__CYWEB_HOST__')).toBe(false)
    expect(target.__CYWEB_HOST__).toBe(original)
  })
})
