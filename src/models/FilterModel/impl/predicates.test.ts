// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { FilterPredicate } from '../FilterTree'
import {
  compareDouble,
  compileRegex,
  MAX_REGEX_LENGTH,
  numericAccepts,
  stringAccepts,
  toNumericBounds,
} from './predicates'

const P = FilterPredicate

describe('compareDouble', () => {
  it('orders numbers like Java Double.compare', () => {
    expect(compareDouble(1, 2)).toBe(-1)
    expect(compareDouble(2, 1)).toBe(1)
    expect(compareDouble(2, 2)).toBe(0)
    expect(compareDouble(-0, 0)).toBe(-1)
    expect(compareDouble(0, -0)).toBe(1)
    expect(compareDouble(NaN, NaN)).toBe(0)
    expect(compareDouble(NaN, Infinity)).toBe(1)
    expect(compareDouble(Infinity, NaN)).toBe(-1)
  })
})

describe('numericAccepts', () => {
  it.each([
    [P.IS, 5, true],
    [P.IS, 6, false],
    [P.IS_NOT, 5, false],
    [P.IS_NOT, 6, true],
    [P.GREATER_THAN, 5, false],
    [P.GREATER_THAN, 6, true],
    [P.GREATER_THAN_OR_EQUAL, 5, true],
    [P.GREATER_THAN_OR_EQUAL, 4, false],
    [P.LESS_THAN, 4, true],
    [P.LESS_THAN, 5, false],
    [P.LESS_THAN_OR_EQUAL, 5, true],
    [P.LESS_THAN_OR_EQUAL, 6, false],
  ] as const)('%s 5 on %d is %s', (predicate, value, expected) => {
    // The single-value predicates read the lower bound only
    expect(numericAccepts(predicate, 5, 100, value)).toBe(expected)
  })

  it('treats BETWEEN as inclusive of both bounds', () => {
    expect(numericAccepts(P.BETWEEN, 200, 300, 200)).toBe(true)
    expect(numericAccepts(P.BETWEEN, 200, 300, 300)).toBe(true)
    expect(numericAccepts(P.BETWEEN, 200, 300, 199.9)).toBe(false)
    expect(numericAccepts(P.IS_NOT_BETWEEN, 200, 300, 250)).toBe(false)
    expect(numericAccepts(P.IS_NOT_BETWEEN, 200, 300, 301)).toBe(true)
  })

  it('rejects a missing value except for IS_NOT_BETWEEN', () => {
    Object.values(P).forEach((predicate) => {
      expect(numericAccepts(predicate, 1, 2, null)).toBe(
        predicate === P.IS_NOT_BETWEEN,
      )
    })
  })

  it('counts NaN as not between', () => {
    expect(numericAccepts(P.BETWEEN, 0, 10, NaN)).toBe(false)
    expect(numericAccepts(P.IS_NOT_BETWEEN, 0, 10, NaN)).toBe(true)
    // Java Double.compare puts NaN above everything
    expect(numericAccepts(P.GREATER_THAN, 0, 0, NaN)).toBe(true)
  })

  it('rejects every value for a text predicate or missing bounds', () => {
    expect(numericAccepts(P.CONTAINS, 1, 1, 1)).toBe(false)
    expect(numericAccepts(P.REGEX, 1, 1, 1)).toBe(false)
    expect(numericAccepts(P.IS, null, null, 1)).toBe(false)
    expect(numericAccepts(P.BETWEEN, null, null, 1)).toBe(false)
  })
})

describe('stringAccepts', () => {
  it('ignores case unless case-sensitive', () => {
    expect(stringAccepts(P.IS, 'abc', false, 'ABC')).toBe(true)
    expect(stringAccepts(P.IS, 'abc', true, 'ABC')).toBe(false)
    expect(stringAccepts(P.CONTAINS, 'B', false, 'abc')).toBe(true)
    expect(stringAccepts(P.CONTAINS, 'B', true, 'abc')).toBe(false)
  })

  it('compares text', () => {
    expect(stringAccepts(P.IS, 'aaa', false, 'aaa')).toBe(true)
    expect(stringAccepts(P.IS, 'a', false, 'aaa')).toBe(false)
    expect(stringAccepts(P.IS_NOT, 'aaa', false, 'bbb')).toBe(true)
    expect(stringAccepts(P.CONTAINS, 'a', false, 'bab')).toBe(true)
    expect(stringAccepts(P.DOES_NOT_CONTAIN, 'a', false, 'bab')).toBe(false)
    // An empty criterion is contained in every text
    expect(stringAccepts(P.CONTAINS, '', false, 'x')).toBe(true)
  })

  it('accepts a missing value only for the negated predicates', () => {
    expect(stringAccepts(P.IS, 'a', false, null)).toBe(false)
    expect(stringAccepts(P.CONTAINS, 'a', false, null)).toBe(false)
    expect(stringAccepts(P.REGEX, '.*', false, null, /^(?:.*)$/)).toBe(false)
    expect(stringAccepts(P.IS_NOT, 'a', false, null)).toBe(true)
    expect(stringAccepts(P.DOES_NOT_CONTAIN, 'a', false, null)).toBe(true)
  })

  it('rejects every value for a numeric predicate', () => {
    expect(stringAccepts(P.BETWEEN, 'a', false, 'a')).toBe(false)
    expect(stringAccepts(P.GREATER_THAN, 'a', false, 'b')).toBe(false)
  })

  it('matches REGEX against the whole value', () => {
    const regex = compileRegex('.a.', false) as RegExp
    expect(stringAccepts(P.REGEX, '.a.', false, 'aaa', regex)).toBe(true)
    expect(stringAccepts(P.REGEX, '.a.', false, 'xaxx', regex)).toBe(false)
    // No compiled pattern: rejected
    expect(stringAccepts(P.REGEX, '.a.', false, 'aaa')).toBe(false)
  })
})

describe('compileRegex', () => {
  it('anchors the pattern at both ends', () => {
    const regex = compileRegex('a|b', true) as RegExp
    expect(regex.test('a')).toBe(true)
    expect(regex.test('ab')).toBe(false)
  })

  it('ignores case unless case-sensitive', () => {
    expect((compileRegex('abc', false) as RegExp).test('ABC')).toBe(true)
    expect((compileRegex('abc', true) as RegExp).test('ABC')).toBe(false)
  })

  it('accepts Java identity escapes', () => {
    expect((compileRegex('a\\_b', true) as RegExp).test('a_b')).toBe(true)
  })

  it('returns an Error for a pattern that does not compile', () => {
    // Possessive quantifiers are Java-only
    expect(compileRegex('a++', true)).toBeInstanceOf(Error)
    expect(compileRegex('(', true)).toBeInstanceOf(Error)
  })

  it('returns an Error for a pattern that is too long', () => {
    expect(compileRegex('a'.repeat(MAX_REGEX_LENGTH + 1), true)).toBeInstanceOf(
      Error,
    )
    expect(compileRegex('a'.repeat(MAX_REGEX_LENGTH), true)).toBeInstanceOf(
      RegExp,
    )
  })
})

describe('toNumericBounds', () => {
  it('reads a number as a one-value range', () => {
    expect(toNumericBounds(3)).toEqual([3, 3])
    expect(toNumericBounds([1, 2])).toEqual([1, 2])
  })

  it('returns null for any other criterion', () => {
    expect(toNumericBounds('3')).toBeNull()
    expect(toNumericBounds(true)).toBeNull()
    expect(toNumericBounds(null)).toBeNull()
  })
})
