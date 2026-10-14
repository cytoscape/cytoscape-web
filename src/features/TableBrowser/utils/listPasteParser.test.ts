import { describe, expect, it } from 'vitest'

import {
  detectDelimiter,
  parsePastedItems,
  segmentPastedText,
} from './listPasteParser'

describe('listPasteParser (CW-563 paste)', () => {
  describe('detectDelimiter', () => {
    it('prefers newline, then tab, then comma, then semicolon', () => {
      expect(detectDelimiter('a\nb')).toBe('newline')
      expect(detectDelimiter('a\tb,c')).toBe('tab')
      expect(detectDelimiter('a,b')).toBe('comma')
      expect(detectDelimiter('a;b')).toBe('semicolon')
    })

    it('defaults to newline when no separator is present', () => {
      expect(detectDelimiter('single')).toBe('newline')
      expect(detectDelimiter('')).toBe('newline')
    })

    it('treats CRLF as newline', () => {
      expect(detectDelimiter('a\r\nb')).toBe('newline')
    })
  })

  describe('segmentPastedText', () => {
    it('returns [] for empty input', () => {
      expect(segmentPastedText('', 'comma')).toEqual([])
    })

    it('interleaves token and delimiter segments', () => {
      const segs = segmentPastedText('a,b', 'comma')
      expect(segs).toEqual([
        { type: 'token', text: 'a', display: 'a' },
        { type: 'delimiter', text: ',', display: ',' },
        { type: 'token', text: 'b', display: 'b' },
      ])
    })

    it('renders newline separators with a visible glyph', () => {
      const segs = segmentPastedText('a\nb', 'newline')
      expect(segs[1]).toEqual({ type: 'delimiter', text: '\n', display: '↵' })
    })

    it('omits empty tokens from consecutive separators', () => {
      const segs = segmentPastedText('a,,b', 'comma')
      const tokens = segs.filter((s) => s.type === 'token').map((s) => s.text)
      expect(tokens).toEqual(['a', 'b'])
      // still shows both separators
      expect(segs.filter((s) => s.type === 'delimiter')).toHaveLength(2)
    })

    it('does not split on a separator that is not the chosen one', () => {
      const segs = segmentPastedText('a,b', 'newline')
      expect(segs).toEqual([{ type: 'token', text: 'a,b', display: 'a,b' }])
    })
  })

  describe('parsePastedItems', () => {
    it('trims tokens and drops blanks', () => {
      expect(parsePastedItems(' a , b ,  , c ', 'comma')).toEqual([
        'a',
        'b',
        'c',
      ])
    })

    it('handles newline-separated spreadsheet-style paste', () => {
      expect(parsePastedItems('alice\nbob\ncarol\n', 'newline')).toEqual([
        'alice',
        'bob',
        'carol',
      ])
    })

    it('keeps a value that contains a non-chosen separator intact', () => {
      // "a,b,c" pasted as one newline-delimited item stays one item
      expect(parsePastedItems('a,b,c', 'newline')).toEqual(['a,b,c'])
    })
  })
})
