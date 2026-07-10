import { afterEach, describe, expect, it, vi } from 'vitest'

import { logApp } from '../../../debug'
import {
  isAllowedOrigin,
  isHostCompatible,
  parseSingleEntryManifest,
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
