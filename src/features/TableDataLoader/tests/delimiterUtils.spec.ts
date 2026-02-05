import {
  convertFileDelimiterToEffective,
  convertFileDelimiterToStorageValue,
} from '../model/impl/DelimiterUtils'

describe('DelimiterUtils', () => {
  describe('convertFileDelimiterToEffective', () => {
    it('returns undefined for auto-detect', () => {
      const result = convertFileDelimiterToEffective('auto')
      expect(result).toBeUndefined()
    })

    it('returns tab character for tab', () => {
      const result = convertFileDelimiterToEffective('tab')
      expect(result).toBe('\t')
    })

    it('returns space character for space', () => {
      const result = convertFileDelimiterToEffective('space')
      expect(result).toBe(' ')
    })

    it('returns custom delimiter when provided', () => {
      const result = convertFileDelimiterToEffective('custom', ':')
      expect(result).toBe(':')
    })

    it('returns undefined when custom is selected but no value provided', () => {
      const result = convertFileDelimiterToEffective('custom')
      expect(result).toBeUndefined()
    })

    it('returns the delimiter directly for standard delimiters', () => {
      expect(convertFileDelimiterToEffective(',')).toBe(',')
      expect(convertFileDelimiterToEffective(';')).toBe(';')
      expect(convertFileDelimiterToEffective('|')).toBe('|')
    })

    it('handles other custom delimiter characters', () => {
      expect(convertFileDelimiterToEffective('#')).toBe('#')
      expect(convertFileDelimiterToEffective('@')).toBe('@')
    })
  })

  describe('convertFileDelimiterToStorageValue', () => {
    it('returns comma for auto-detect', () => {
      const result = convertFileDelimiterToStorageValue('auto')
      expect(result).toBe(',')
    })

    it('returns tab character for tab', () => {
      const result = convertFileDelimiterToStorageValue('tab')
      expect(result).toBe('\t')
    })

    it('returns space character for space', () => {
      const result = convertFileDelimiterToStorageValue('space')
      expect(result).toBe(' ')
    })

    it('returns custom delimiter when provided', () => {
      const result = convertFileDelimiterToStorageValue('custom', ':')
      expect(result).toBe(':')
    })

    it('returns comma as fallback when custom is selected but no value provided', () => {
      const result = convertFileDelimiterToStorageValue('custom')
      expect(result).toBe(',')
    })

    it('returns the delimiter directly for standard delimiters', () => {
      expect(convertFileDelimiterToStorageValue(',')).toBe(',')
      expect(convertFileDelimiterToStorageValue(';')).toBe(';')
      expect(convertFileDelimiterToStorageValue('|')).toBe('|')
    })

    it('handles other custom delimiter characters', () => {
      expect(convertFileDelimiterToStorageValue('#')).toBe('#')
      expect(convertFileDelimiterToStorageValue('@')).toBe('@')
    })
  })
})

