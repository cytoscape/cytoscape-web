import { describe, expect, it } from 'vitest'

import { resolveNodeGraphics } from './nodeGraphicsResolve'

const HOOK_ID = 'hook-1'
const URL = 'https://example.com/a.png'

describe('resolveNodeGraphics', () => {
  describe('declining', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
    ])('returns null for %s', (_label, value) => {
      expect(resolveNodeGraphics(value as any, HOOK_ID)).toBeNull()
    })

    it.each([
      ['blob:', 'blob:http://localhost/x'],
      ['file:', 'file:///tmp/x.png'],
      ['an unrecognized scheme', 'ftp://example.com/x.png'],
      ['a bare filename', 'x.png'],
    ])('returns null for %s', (_label, value) => {
      expect(resolveNodeGraphics(value, HOOK_ID)).toBeNull()
    })

    it.each([
      ['a number', 42],
      ['a boolean', true],
    ])('returns null for %s rather than throwing', (_label, value) => {
      expect(resolveNodeGraphics(value as any, HOOK_ID)).toBeNull()
    })

    it('returns null for a JSON chart object, which is not an image', () => {
      expect(
        resolveNodeGraphics('{"cy_dataColumns":["a"]}', HOOK_ID),
      ).toBeNull()
    })

    it('returns null when the object carries no usable image', () => {
      expect(resolveNodeGraphics({ image: 'blob:x' }, HOOK_ID)).toBeNull()
    })
  })

  describe('string shorthand', () => {
    it('accepts a bare URL and applies every default', () => {
      expect(resolveNodeGraphics(URL, HOOK_ID)).toEqual({
        image: URL,
        fit: 'contain',
        opacity: 1,
        crossOrigin: 'null',
        containment: 'inside',
        hookId: HOOK_ID,
      })
    })

    it('promotes raw <svg> markup to a data URI', () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>'

      const resolved = resolveNodeGraphics(svg, HOOK_ID)

      expect(resolved?.image).toBe(
        'data:image/svg+xml,' + encodeURIComponent(svg),
      )
    })
  })

  describe('full form', () => {
    it('passes through valid values', () => {
      const resolved = resolveNodeGraphics(
        {
          image: URL,
          fit: 'cover',
          opacity: 0.5,
          crossOrigin: 'anonymous',
          containment: 'over',
        },
        HOOK_ID,
      )

      expect(resolved).toEqual({
        image: URL,
        fit: 'cover',
        opacity: 0.5,
        crossOrigin: 'anonymous',
        containment: 'over',
        hookId: HOOK_ID,
      })
    })

    it('stamps the hookId so removing a hook can drop only its images', () => {
      expect(resolveNodeGraphics(URL, 'other-hook')?.hookId).toBe('other-hook')
    })
  })

  describe('rejecting invalid enum values', () => {
    // Passing these through would make Cytoscape.js warn on every restyle.
    it('falls back to the default fit', () => {
      expect(
        resolveNodeGraphics({ image: URL, fit: 'squish' as any }, HOOK_ID)?.fit,
      ).toBe('contain')
    })

    it('falls back to the default crossOrigin', () => {
      expect(
        resolveNodeGraphics(
          { image: URL, crossOrigin: 'yes-please' as any },
          HOOK_ID,
        )?.crossOrigin,
      ).toBe('null')
    })

    it('falls back to the default containment', () => {
      expect(
        resolveNodeGraphics(
          { image: URL, containment: 'behind' as any },
          HOOK_ID,
        )?.containment,
      ).toBe('inside')
    })
  })

  describe('opacity', () => {
    it.each([
      ['above 1', 5, 1],
      ['below 0', -3, 0],
      ['exactly 0', 0, 0],
      ['exactly 1', 1, 1],
      ['a fraction', 0.25, 0.25],
    ])('clamps %s to %s', (_label, input, expected) => {
      expect(
        resolveNodeGraphics({ image: URL, opacity: input }, HOOK_ID)?.opacity,
      ).toBe(expected)
    })

    it.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['a string', '0.5'],
      ['undefined', undefined],
    ])('defaults to 1 for %s', (_label, input) => {
      expect(
        resolveNodeGraphics({ image: URL, opacity: input as any }, HOOK_ID)
          ?.opacity,
      ).toBe(1)
    })
  })
})
