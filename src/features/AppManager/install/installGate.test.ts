import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { logApp } from '../../../debug'
import {
  isAllowedOrigin,
  isHostCompatible,
  isLocalhostAppOptIn,
  isCatalogEntryAllowed,
  parseSingleEntryManifest,
  validateManifestUrl,
} from './installGate'

const validEntry = {
  id: 'hello',
  url: 'https://apps.cytoscape.org/web/hello/1.0.0/remoteEntry.js',
  author: 'Cytoscape Team',
}

describe('installGate', () => {
  describe('parseSingleEntryManifest', () => {
    it('returns the single entry for a one-element manifest', () => {
      const result = parseSingleEntryManifest([validEntry])
      expect(result?.id).toBe('hello')
      expect(result?.url).toBe(validEntry.url)
    })

    it('returns undefined for an empty array', () => {
      expect(parseSingleEntryManifest([])).toBeUndefined()
    })

    it('returns undefined for a non-array / invalid manifest', () => {
      expect(parseSingleEntryManifest({ not: 'an array' })).toBeUndefined()
    })

    it('returns the first entry and warns when more than one is present', () => {
      const warnSpy = vi.spyOn(logApp, 'warn').mockImplementation(() => {})
      const result = parseSingleEntryManifest([
        validEntry,
        {
          id: 'second',
          url: 'https://apps.cytoscape.org/web/second/1.0.0/remoteEntry.js',
          author: 'x',
        },
      ])
      expect(result?.id).toBe('hello')
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('isAllowedOrigin', () => {
    const allowed = ['https://apps.cytoscape.org']

    it('allows an exact origin match', () => {
      expect(
        isAllowedOrigin(
          'https://apps.cytoscape.org/web/hello/1.0.0/remoteEntry.js',
          allowed,
        ),
      ).toBe(true)
    })

    it('rejects a different host', () => {
      expect(
        isAllowedOrigin('https://evil.example.com/remoteEntry.js', allowed),
      ).toBe(false)
    })

    it('rejects a different port (origin includes port)', () => {
      expect(
        isAllowedOrigin(
          'https://apps.cytoscape.org:8443/remoteEntry.js',
          allowed,
        ),
      ).toBe(false)
    })

    it('rejects an invalid URL string', () => {
      expect(isAllowedOrigin('not a url', allowed)).toBe(false)
    })

    describe('localhost allowance', () => {
      const originalLocation = window.location

      const setHostname = (hostname: string): void => {
        Object.defineProperty(window, 'location', {
          configurable: true,
          writable: true,
          value: { hostname },
        })
      }

      afterEach(() => {
        Object.defineProperty(window, 'location', {
          configurable: true,
          writable: true,
          value: originalLocation,
        })
      })

      it('allows a localhost URL when the host runs on localhost', () => {
        setHostname('localhost')
        expect(
          isAllowedOrigin('http://localhost:2222/remoteEntry.js', allowed),
        ).toBe(true)
      })

      it('allows a 127.0.0.1 URL when the host runs on localhost', () => {
        setHostname('127.0.0.1')
        expect(
          isAllowedOrigin('http://127.0.0.1:2222/remoteEntry.js', allowed),
        ).toBe(true)
      })

      it('rejects a localhost URL when the host is not localhost', () => {
        setHostname('web.cytoscape.org')
        expect(
          isAllowedOrigin('http://localhost:2222/remoteEntry.js', allowed),
        ).toBe(false)
      })

      it('still allows an allow-listed origin when the host is not localhost', () => {
        setHostname('web.cytoscape.org')
        expect(
          isAllowedOrigin(
            'https://apps.cytoscape.org/web/hello/1.0.0/remoteEntry.js',
            allowed,
          ),
        ).toBe(true)
      })
    })
  })

  describe('isLocalhostAppOptIn', () => {
    const DEV1 = 'https://dev1.ndexbio.org'

    it('is on when the configured origin is the one being served', () => {
      expect(isLocalhostAppOptIn(DEV1, DEV1)).toBe(true)
    })

    it('is off when the configured origin is a different deployment', () => {
      expect(isLocalhostAppOptIn(DEV1, 'https://web.cytoscape.org')).toBe(false)
    })

    // The property the whole design rests on: src/assets/config.json is the
    // development server's config, and a production build starts from a copy of
    // it. Carrying this field forward unedited must not enable anything.
    it('does nothing when the committed dev value is copied into production', () => {
      const committed = JSON.parse(
        readFileSync(
          resolve(__dirname, '../../../assets/config.json'),
          'utf8',
        ),
      ) as { allowsLocalhostAppsOn?: string }

      expect(committed.allowsLocalhostAppsOn).toBe(DEV1)
      expect(
        isLocalhostAppOptIn(
          committed.allowsLocalhostAppsOn,
          'https://web.cytoscape.org',
        ),
      ).toBe(false)
    })

    it('normalizes a value carrying a path down to its origin', () => {
      expect(isLocalhostAppOptIn(`${DEV1}/cytoscape/`, DEV1)).toBe(true)
    })

    it('is off when absent', () => {
      expect(isLocalhostAppOptIn(undefined, DEV1)).toBe(false)
    })

    it('is off for an empty value', () => {
      expect(isLocalhostAppOptIn('   ', DEV1)).toBe(false)
    })

    it('is off when the served origin is unknown', () => {
      expect(isLocalhostAppOptIn(DEV1, undefined)).toBe(false)
    })

    it.each([
      ['not a url', 'not a url'],
      ['a wildcard', '*'],
      ['a bare hostname', 'dev1.ndexbio.org'],
      ['a scheme with no usable origin', 'foo:bar'],
    ])('is off and warns for %s', (_label, value) => {
      const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => undefined)
      expect(isLocalhostAppOptIn(value, DEV1)).toBe(false)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('allowsLocalhostAppsOn'),
      )
    })

    it('is off and warns for a non-string value', () => {
      const warn = vi.spyOn(logApp, 'warn').mockImplementation(() => undefined)
      expect(isLocalhostAppOptIn(true, DEV1)).toBe(false)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('must be a string'),
      )
    })
  })

  describe('isHostCompatible', () => {
    it('returns true for an undefined range', () => {
      expect(isHostCompatible(undefined, '1.0.7')).toBe(true)
    })

    it('returns true for an empty/whitespace range', () => {
      expect(isHostCompatible('   ', '1.0.7')).toBe(true)
    })

    it('returns true when the host version satisfies the range', () => {
      expect(isHostCompatible('>=1.0.0', '1.0.7')).toBe(true)
    })

    it('returns false when the host version does not satisfy the range', () => {
      expect(isHostCompatible('>=2.0.0', '1.0.7')).toBe(false)
    })

    it('returns true and warns for an unparsable range', () => {
      const warnSpy = vi.spyOn(logApp, 'warn').mockImplementation(() => {})
      expect(isHostCompatible('not-a-range', '1.0.7')).toBe(true)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('returns true when the host version is unknown or invalid', () => {
      expect(isHostCompatible('>=2.0.0', 'not-a-version')).toBe(true)
    })
  })
})

describe('localhost apps on an opted-in deployment', () => {
  const DEV1 = 'https://dev1.ndexbio.org'
  const allowed = ['https://apps.cytoscape.org']
  const originalLocation = window.location

  const serveFrom = (origin: string): void => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { origin, hostname: new URL(origin).hostname },
    })
  }

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  describe('isAllowedOrigin', () => {
    it('allows a localhost app when the served origin is the opted-in one', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin('http://localhost:6000/remoteEntry.js', allowed, DEV1),
      ).toBe(true)
    })

    it('allows 127.0.0.1 too', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin('http://127.0.0.1:6000/remoteEntry.js', allowed, DEV1),
      ).toBe(true)
    })

    // The regression that matters: this is production's behaviour, and it must
    // not change because the field exists.
    it('refuses a localhost app when no opt-in is configured', () => {
      serveFrom('https://web.cytoscape.org')
      expect(
        isAllowedOrigin('http://localhost:6000/remoteEntry.js', allowed),
      ).toBe(false)
    })

    // D-2 itself: the committed dev1 value carried into another deployment.
    it('refuses when the opt-in names a different deployment', () => {
      serveFrom('https://web.cytoscape.org')
      expect(
        isAllowedOrigin('http://localhost:6000/remoteEntry.js', allowed, DEV1),
      ).toBe(false)
    })

    it('does not widen anything beyond localhost', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin('https://evil.example.com/remoteEntry.js', allowed, DEV1),
      ).toBe(false)
    })

    it('still allows an allow-listed origin', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin(
          'https://apps.cytoscape.org/web/hello/1.0.0/remoteEntry.js',
          allowed,
          DEV1,
        ),
      ).toBe(true)
    })

    // `new URL('http://[::1]:6000/x').hostname` is "[::1]", brackets included,
    // which is how a dev server bound to localhost is reached on an
    // IPv6-preferring system.
    it('allows the IPv6 loopback', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin('http://[::1]:6000/remoteEntry.js', allowed, DEV1),
      ).toBe(true)
    })

    it('allows a localhost app when the host itself is on IPv6 loopback', () => {
      serveFrom('http://[::1]:5500')
      expect(
        isAllowedOrigin('http://localhost:6000/remoteEntry.js', allowed),
      ).toBe(true)
    })

    it('refuses a hostname that merely contains "localhost"', () => {
      serveFrom(DEV1)
      expect(
        isAllowedOrigin(
          'http://localhost.evil.example.com/remoteEntry.js',
          allowed,
          DEV1,
        ),
      ).toBe(false)
    })
  })

  describe('validateManifestUrl', () => {
    it('accepts https anywhere', () => {
      serveFrom(DEV1)
      expect(validateManifestUrl('https://example.com/apps.json')).toBeUndefined()
    })

    it('accepts http from a localhost page, as before', () => {
      serveFrom('http://localhost:5500')
      expect(
        validateManifestUrl('http://localhost:6000/cyweb-app.json'),
      ).toBeUndefined()
    })

    // Without this, every other part of the flow is unreachable from dev1: the
    // developer cannot even type their dev server's manifest URL.
    it('accepts an http localhost manifest when the deployment opted in', () => {
      serveFrom(DEV1)
      expect(
        validateManifestUrl('http://localhost:6000/cyweb-app.json', DEV1),
      ).toBeUndefined()
    })

    it('rejects an http localhost manifest without the opt-in', () => {
      serveFrom(DEV1)
      expect(validateManifestUrl('http://localhost:6000/cyweb-app.json')).toBe(
        'URL must use HTTPS protocol',
      )
    })

    // The opt-in is about localhost, so it must not turn into "http anywhere".
    it('still rejects a non-localhost http manifest when opted in', () => {
      serveFrom(DEV1)
      expect(
        validateManifestUrl('http://evil.example.com/apps.json', DEV1),
      ).toBe('URL must use HTTPS protocol')
    })

    it('accepts an IPv6 loopback manifest when the deployment opted in', () => {
      serveFrom(DEV1)
      expect(
        validateManifestUrl('http://[::1]:6000/cyweb-app.json', DEV1),
      ).toBeUndefined()
    })

    it('reports an unparsable URL', () => {
      serveFrom(DEV1)
      expect(validateManifestUrl('http://[::1', DEV1)).toBe(
        'Invalid URL format',
      )
    })
  })
})

describe('isCatalogEntryAllowed', () => {
  const ALLOWED = ['https://apps.cytoscape.org']
  // What src/assets/apps.json actually ships: an origin deliberately absent
  // from the install allow-list.
  const BUNDLED = 'https://cytoscape.org/cytoscape-web-app-examples/hello/remoteEntry.js'
  const UNLISTED = 'https://evil.example.com/remoteEntry.js'
  const originalLocation = window.location

  const serveFrom = (origin: string): void => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { origin, hostname: new URL(origin).hostname },
    })
  }

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  // The regression this exemption exists to avoid: sending the catalog through
  // isAllowedOrigin would disable every app the product ships with.
  it('trusts the deployment default manifest even off the allow-list', () => {
    serveFrom('https://web.cytoscape.org')
    expect(isCatalogEntryAllowed(BUNDLED, true, ALLOWED)).toBe(true)
  })

  // G-6: the bypass. Today this loads; it must not.
  it('refuses an entry the default manifest does not list', () => {
    serveFrom('https://web.cytoscape.org')
    expect(isCatalogEntryAllowed(UNLISTED, false, ALLOWED)).toBe(false)
  })

  // H-2: an organization keeps working by being allow-listed, not unchecked.
  it('allows a non-manifest entry on an allow-listed origin', () => {
    serveFrom('https://web.cytoscape.org')
    expect(
      isCatalogEntryAllowed(
        'https://apps.cytoscape.org/web/hello/1.0.0/remoteEntry.js',
        false,
        ALLOWED,
      ),
    ).toBe(true)
  })

  // The acceptance constraint that names this project: closing the bypass must
  // not close the route Phases 1-2 opened.
  it('allows a localhost app outside the manifest when the deployment opted in', () => {
    serveFrom('https://dev1.ndexbio.org')
    expect(
      isCatalogEntryAllowed(
        'http://localhost:6000/remoteEntry.js',
        false,
        ALLOWED,
        'https://dev1.ndexbio.org',
      ),
    ).toBe(true)
  })

  it('refuses that same entry on a deployment that did not opt in', () => {
    serveFrom('https://web.cytoscape.org')
    expect(
      isCatalogEntryAllowed(
        'http://localhost:6000/remoteEntry.js',
        false,
        ALLOWED,
        'https://dev1.ndexbio.org',
      ),
    ).toBe(false)
  })
})
