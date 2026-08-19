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

  describe('values that cannot be coerced to a string', () => {
    // String(value) itself throws for these. The function is documented as
    // never throwing and runs in the render path, so each must come back as a
    // rejection instead of breaking the frame. `raw` is empty because there is
    // no string to report.
    it.each([
      ['a null-prototype object', () => Object.create(null) as unknown],
      [
        'an object whose toString throws',
        () =>
          ({
            toString() {
              throw new Error('toString exploded')
            },
          }) as unknown,
      ],
      [
        'an object whose Symbol.toPrimitive throws',
        () =>
          ({
            [Symbol.toPrimitive]() {
              throw new Error('toPrimitive exploded')
            },
          }) as unknown,
      ],
    ])('rejects %s without throwing', (_label, make) => {
      const value = make()

      expect(() => normalizeImageSource(value)).not.toThrow()
      expect(normalizeImageSource(value)).toEqual({
        kind: 'rejected',
        reason: 'unrecognized',
        raw: '',
      })
    })

    it('rejects a symbol through the normal unrecognized path', () => {
      // String(symbol) does not throw — the spec special-cases the explicit
      // call — so this one reaches the scheme check like any other string.
      const result = normalizeImageSource(Symbol('nope'))

      expect(result.kind).toBe('rejected')
      expect(result.kind === 'rejected' && result.reason).toBe('unrecognized')
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

  it('wraps in an outer SVG matching the node box', () => {
    // The outer box must equal the node box, or Cytoscape's image offset stops
    // being zero and the graphic drifts as the canvas zooms.
    const url =
      'data:image/svg+xml,' + encodeURIComponent('<svg><circle r="5"/></svg>')

    const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 60, 40))

    expect(wrapped).toContain('viewBox="0 0 60 40"')
    expect(wrapped).toContain('width="60" height="40"')
  })

  it('keeps the source content', () => {
    const url =
      'data:image/svg+xml,' + encodeURIComponent('<svg><circle r="5"/></svg>')

    expect(decodeWrapper(wrapSvgDataUriForSize(url, 60, 40))).toContain(
      '<circle r="5"/>',
    )
  })

  it('unwraps a base64 SVG data URI before wrapping', () => {
    const inner = '<svg><rect width="1" height="1"/></svg>'
    const url = 'data:image/svg+xml;base64,' + btoa(inner)

    const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 30, 30))

    expect(wrapped).toContain('<rect width="1" height="1"/>')
  })

  describe('aspect ratio', () => {
    // Verified in real Cytoscape: the previous min(width, height) square inner
    // viewport confined a wide graphic to the short axis, and rendered a source
    // with intrinsic dimensions at natural size — which cropped it and left the
    // visible remnant drifting off-centre as the canvas zoomed.
    it('lets the source fill the box while preserving its own ratio', () => {
      const url =
        'data:image/svg+xml,' +
        encodeURIComponent('<svg viewBox="0 0 200 50"><rect/></svg>')

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 100, 40))

      expect(wrapped).toContain('width="100%" height="100%"')
      expect(wrapped).toContain('preserveAspectRatio="xMidYMid meet"')
      // No min(width, height) square viewport any more.
      expect(wrapped).not.toContain('width="40" height="40"')
    })

    it('derives a viewBox for a source that has dimensions but none', () => {
      // Stripping width/height without adding a viewBox would leave the source
      // with no scalable coordinate system, so it would render at 1:1 and crop.
      const url =
        'data:image/svg+xml,' +
        encodeURIComponent('<svg width="100" height="100"><rect/></svg>')

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 60, 30))

      expect(wrapped).toContain('viewBox="0 0 100 100"')
      expect(wrapped).toContain('width="100%" height="100%"')
    })

    it('handles single-quoted dimensions', () => {
      // Single quotes are legal in SVG. Missing them would leave the source
      // width in place beside the wrapper's, and two width attributes make the
      // data URI invalid XML — the image then fails to load entirely.
      const url =
        'data:image/svg+xml,' +
        encodeURIComponent("<svg width='200' height='50'><rect/></svg>")

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 60, 30))

      expect(wrapped).toContain('viewBox="0 0 200 50"')
      expect(wrapped).not.toContain("width='200'")
      expect(wrapped).not.toContain("height='50'")
      expect(wrapped.match(/\swidth=/g)).toHaveLength(2) // wrapper + source root
    })

    it('keeps an existing viewBox rather than deriving one', () => {
      const url =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg width="200" height="50" viewBox="0 0 400 100"><rect/></svg>',
        )

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 60, 30))

      expect(wrapped).toContain('viewBox="0 0 400 100"')
      expect(wrapped).not.toContain('viewBox="0 0 200 50"')
    })

    it('replaces a source preserveAspectRatio rather than duplicating it', () => {
      const url =
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg viewBox="0 0 10 10" preserveAspectRatio="none"><rect/></svg>',
        )

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 40, 40))

      expect(wrapped).not.toContain('preserveAspectRatio="none"')
      expect(wrapped.match(/preserveAspectRatio=/g)).toHaveLength(1)
    })

    it('does not corrupt a self-closing source tag', () => {
      const url = 'data:image/svg+xml,' + encodeURIComponent('<svg/>')

      const wrapped = decodeWrapper(wrapSvgDataUriForSize(url, 100, 40))

      expect(wrapped).toContain('preserveAspectRatio="xMidYMid meet"/>')
      expect(wrapped).not.toContain('/ width')
    })
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
