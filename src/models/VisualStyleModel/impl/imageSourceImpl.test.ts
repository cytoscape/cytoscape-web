import { describe, expect, it } from 'vitest'

import {
  describeImageSourceRejection,
  normalizeImageSource,
  wrapSvgDataUriForSize,
} from './imageSourceImpl'

describe('normalizeImageSource', () => {
  describe('rejected schemes', () => {
    it('rejects blob: URLs because they are ephemeral', () => {
      const result = normalizeImageSource('blob:http://localhost/abc-123')

      expect(result).toEqual({
        kind: 'rejected',
        reason: 'blob',
        raw: 'blob:http://localhost/abc-123',
      })
    })

    it('rejects file: URLs', () => {
      const result = normalizeImageSource('file:///Users/me/pic.png')

      expect(result.kind).toBe('rejected')
      expect(result.kind === 'rejected' && result.reason).toBe('file')
    })

    it('rejects a scheme it does not recognize', () => {
      const result = normalizeImageSource('ftp://example.com/pic.png')

      expect(result.kind).toBe('rejected')
      expect(result.kind === 'rejected' && result.reason).toBe('unrecognized')
    })

    it('rejects a bare filename', () => {
      const result = normalizeImageSource('pic.png')

      expect(result.kind === 'rejected' && result.reason).toBe('unrecognized')
    })
  })

  describe('empty input', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['whitespace only', '   \n\t  '],
    ])('rejects %s as empty', (_label, value) => {
      const result = normalizeImageSource(value)

      expect(result).toEqual({ kind: 'rejected', reason: 'empty', raw: '' })
    })
  })

  describe('accepted URLs', () => {
    it.each([
      ['http', 'http://example.com/pic.png'],
      ['https', 'https://example.com/pic.png'],
      ['data URI', 'data:image/png;base64,iVBORw0KGgo='],
      ['svg data URI', 'data:image/svg+xml,%3Csvg%2F%3E'],
    ])('accepts a %s URL unchanged', (_label, url) => {
      expect(normalizeImageSource(url)).toEqual({ kind: 'url', url })
    })

    it('trims surrounding whitespace', () => {
      expect(normalizeImageSource('  https://example.com/a.png \n')).toEqual({
        kind: 'url',
        url: 'https://example.com/a.png',
      })
    })
  })

  describe('raw SVG markup', () => {
    it('promotes raw markup to a percent-encoded data URI', () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>'

      const result = normalizeImageSource(svg)

      expect(result.kind).toBe('url')
      expect(result.kind === 'url' && result.url).toBe(
        'data:image/svg+xml,' + encodeURIComponent(svg),
      )
    })

    it('promotes markup that has leading whitespace', () => {
      const result = normalizeImageSource('   <svg><rect/></svg>')

      expect(result.kind === 'url' && result.url).toBe(
        'data:image/svg+xml,' + encodeURIComponent('<svg><rect/></svg>'),
      )
    })
  })

  describe('JSON objects', () => {
    it('classifies an object-looking string as json without parsing it', () => {
      const raw = '{"cy_dataColumns":["a"],"cy_colors":["#f00"]}'

      expect(normalizeImageSource(raw)).toEqual({ kind: 'json', raw })
    })

    it('classifies malformed JSON as json and leaves parsing to the caller', () => {
      expect(normalizeImageSource('{not valid json')).toEqual({
        kind: 'json',
        raw: '{not valid json',
      })
    })
  })

  it('never throws on hostile input', () => {
    const hostile = [
      Symbol.iterator.toString(),
      '{'.repeat(10000),
      '<svg'.repeat(1000),
      42,
      true,
      [],
      {},
    ]

    for (const value of hostile) {
      expect(() => normalizeImageSource(value)).not.toThrow()
    }
  })
})

describe('describeImageSourceRejection', () => {
  it.each(['blob', 'file', 'empty', 'unrecognized'] as const)(
    'returns a non-empty message for %s',
    (reason) => {
      expect(describeImageSourceRejection(reason).length).toBeGreaterThan(0)
    },
  )
})

describe('wrapSvgDataUriForSize', () => {
  const decodeWrapper = (url: string): string =>
    decodeURIComponent(url.substring('data:image/svg+xml,'.length))

  it('leaves a non-SVG URL untouched', () => {
    const url = 'https://example.com/pic.png'

    expect(wrapSvgDataUriForSize(url, 40, 40)).toBe(url)
  })

  it('leaves a raster data URI untouched', () => {
    const url = 'data:image/png;base64,iVBORw0KGgo='

    expect(wrapSvgDataUriForSize(url, 40, 40)).toBe(url)
  })

  it('wraps a percent-encoded SVG in an outer SVG at the given size', () => {
    const inner = '<svg><circle r="5"/></svg>'
    const url = 'data:image/svg+xml,' + encodeURIComponent(inner)

    const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 60, 40))

    expect(wrapped).toContain('viewBox="0 0 60 40"')
    expect(wrapped).toContain('width="60" height="40"')
    expect(wrapped).toContain(inner)
  })

  it('unwraps a base64 SVG data URI before wrapping', () => {
    const inner = '<svg><rect width="1" height="1"/></svg>'
    const url = 'data:image/svg+xml;base64,' + btoa(inner)

    const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 30, 30))

    expect(wrapped).toContain(inner)
  })

  it('centers the inner SVG on the shorter axis', () => {
    const url = 'data:image/svg+xml,' + encodeURIComponent('<svg/>')

    // size = min(100, 40) = 40; offsetX = (100-40)/2 = 30; offsetY = 0
    const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 100, 40))

    expect(wrapped).toContain('x="30" y="0" width="40" height="40"')
  })

  it('returns the input unchanged when the data URI has no comma', () => {
    const url = 'data:image/svg+xml'

    expect(wrapSvgDataUriForSize(url, 40, 40)).toBe(url)
  })

  it('returns the input unchanged when base64 decoding fails', () => {
    const url = 'data:image/svg+xml;base64,!!!not-base64!!!'

    expect(wrapSvgDataUriForSize(url, 40, 40)).toBe(url)
  })

  it('returns the input unchanged when percent-decoding fails', () => {
    const url = 'data:image/svg+xml,%E0%A4%A'

    expect(wrapSvgDataUriForSize(url, 40, 40)).toBe(url)
  })
})
