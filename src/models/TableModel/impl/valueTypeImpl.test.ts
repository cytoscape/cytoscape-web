// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '..'
import {
  compareLists,
  compareNumbers,
  deserializeValueList,
  getListTypeFromSingle,
  getSingleTypeFromList,
  serializedStringIsValid,
  serializeValue,
  serializeValueList,
} from './valueTypeImpl'

describe('serializeValueList', () => {
  it.each([
    // Empty list should return empty string
    [[], ''],
    // Number list should be comma-separated
    [[1, 2, 3], '1, 2, 3'],
  ])('should serialize list %p to "%s"', (value, expected) => {
    expect(serializeValueList(value)).toBe(expected)
  })
})

describe('serializedStringIsValid', () => {
  it.each([
    // Boolean validation
    [ValueTypeName.Boolean, 'true', true],
    [ValueTypeName.Boolean, 'invalid', false],
    // Double validation
    [ValueTypeName.Double, '3.14', true],
    [ValueTypeName.Double, 'invalid', false],
    // Long validation
    [ValueTypeName.Long, '1234567890', true],
    [ValueTypeName.Long, 'invalid', false],
    // Integer validation
    [ValueTypeName.Integer, '123', true],
    [ValueTypeName.Integer, 'invalid', false],
    // String validation (always valid)
    [ValueTypeName.String, 'hello world', true],
    // ListString validation (accepts any comma-separated string)
    [ValueTypeName.ListString, 'one, two, three', true],
    [ValueTypeName.ListString, 'one, two, invalid', true],
  ])(
    'should return %s for %s type with value "%s"',
    (type, value, expected) => {
      expect(serializedStringIsValid(type, value)).toBe(expected)
    },
  )
})

describe('serializeValue', () => {
  it.each([
    ['hello world', 'hello world'],
    [123, '123'],
    [true, 'true'],
    [['one', 'two', 'three'], 'one, two, three'],
  ])('should serialize value %p to "%s"', (value, expected) => {
    expect(serializeValue(value)).toBe(expected)
  })
})

describe('deserializeValueList', () => {
  it.each([
    [ValueTypeName.ListString, 'one, two, three', ['one', 'two', 'three']],
    [ValueTypeName.ListLong, '1, 2, 3', [1, 2, 3]],
    [ValueTypeName.ListInteger, '1, 2, 3', [1, 2, 3]],
    [ValueTypeName.ListDouble, '1.1, 2.2, 3.3', [1.1, 2.2, 3.3]],
    [ValueTypeName.ListBoolean, 'true, false, true', [true, false, true]],
  ])('should deserialize %s from "%s" to %p', (type, value, expected) => {
    expect(deserializeValueList(type, value)).toEqual(expected)
  })
})

describe('compareLists', () => {
  it.each([
    // String comparison (lexicographic)
    [['one', 'two', 'three'], ['four', 'five', 'six'], 1, 'toBe'],
    // Numeric comparisons (ascending order)
    [[1, 2, 3], [4, 5, 6], 0, 'toBeLessThan'],
    [[1.1, 2.2, 3.3], [4.4, 5.5, 6.6], 0, 'toBeLessThan'],
    // Boolean comparison
    [[true, false, true], [false, true, false], 0, 'toBeGreaterThan'],
  ])(
    'should compare list %p with %p (ascending)',
    (a, b, expected, matcher) => {
      const result = compareLists(a, b, 'asc')
      if (matcher === 'toBe') {
        expect(result).toBe(expected)
      } else if (matcher === 'toBeLessThan') {
        expect(result).toBeLessThan(expected)
      } else {
        expect(result).toBeGreaterThan(expected)
      }
    },
  )
})

describe('getSingleTypeFromList', () => {
  it.each([
    [ValueTypeName.ListString, ValueTypeName.String],
    [ValueTypeName.ListInteger, ValueTypeName.Integer],
    [ValueTypeName.ListLong, ValueTypeName.Long],
    [ValueTypeName.ListDouble, ValueTypeName.Double],
    [ValueTypeName.ListBoolean, ValueTypeName.Boolean],
  ])('should convert list type %s to single type %s', (listType, expected) => {
    expect(getSingleTypeFromList(listType)).toBe(expected)
  })

  it('should return original type if input is not a list type', () => {
    expect(getSingleTypeFromList(ValueTypeName.String)).toBe(
      ValueTypeName.String,
    )
    expect(getSingleTypeFromList(ValueTypeName.Integer)).toBe(
      ValueTypeName.Integer,
    )
    expect(getSingleTypeFromList(ValueTypeName.Boolean)).toBe(
      ValueTypeName.Boolean,
    )
  })

  it('should handle all list types correctly', () => {
    expect(getSingleTypeFromList(ValueTypeName.ListString)).toBe(
      ValueTypeName.String,
    )
    expect(getSingleTypeFromList(ValueTypeName.ListInteger)).toBe(
      ValueTypeName.Integer,
    )
    expect(getSingleTypeFromList(ValueTypeName.ListLong)).toBe(
      ValueTypeName.Long,
    )
    expect(getSingleTypeFromList(ValueTypeName.ListDouble)).toBe(
      ValueTypeName.Double,
    )
    expect(getSingleTypeFromList(ValueTypeName.ListBoolean)).toBe(
      ValueTypeName.Boolean,
    )
  })
})

describe('getListTypeFromSingle', () => {
  it.each([
    [ValueTypeName.String, ValueTypeName.ListString],
    [ValueTypeName.Integer, ValueTypeName.ListInteger],
    [ValueTypeName.Long, ValueTypeName.ListLong],
    [ValueTypeName.Double, ValueTypeName.ListDouble],
    [ValueTypeName.Boolean, ValueTypeName.ListBoolean],
  ])(
    'should convert single type %s to list type %s',
    (singleType, expected) => {
      expect(getListTypeFromSingle(singleType)).toBe(expected)
    },
  )

  it('should return original type if input is not a single type', () => {
    expect(getListTypeFromSingle(ValueTypeName.ListString)).toBe(
      ValueTypeName.ListString,
    )
    expect(getListTypeFromSingle(ValueTypeName.ListInteger)).toBe(
      ValueTypeName.ListInteger,
    )
  })

  it('should handle all single types correctly', () => {
    expect(getListTypeFromSingle(ValueTypeName.String)).toBe(
      ValueTypeName.ListString,
    )
    expect(getListTypeFromSingle(ValueTypeName.Integer)).toBe(
      ValueTypeName.ListInteger,
    )
    expect(getListTypeFromSingle(ValueTypeName.Long)).toBe(
      ValueTypeName.ListLong,
    )
    expect(getListTypeFromSingle(ValueTypeName.Double)).toBe(
      ValueTypeName.ListDouble,
    )
    expect(getListTypeFromSingle(ValueTypeName.Boolean)).toBe(
      ValueTypeName.ListBoolean,
    )
  })
})

describe('round-trip conversion', () => {
  it('should convert list to single and back to list', () => {
    const originalListType = ValueTypeName.ListString
    const singleType = getSingleTypeFromList(originalListType)
    const listType = getListTypeFromSingle(singleType)
    expect(listType).toBe(originalListType)
  })

  it('should convert single to list and back to single', () => {
    const originalSingleType = ValueTypeName.String
    const listType = getListTypeFromSingle(originalSingleType)
    const singleType = getSingleTypeFromList(listType)
    expect(singleType).toBe(originalSingleType)
  })

  it.each([
    ValueTypeName.String,
    ValueTypeName.Integer,
    ValueTypeName.Long,
    ValueTypeName.Double,
    ValueTypeName.Boolean,
  ])('should correctly round-trip convert %s', (singleType) => {
    const listType = getListTypeFromSingle(singleType)
    const convertedBack = getSingleTypeFromList(listType)
    expect(convertedBack).toBe(singleType)
  })
})

// REVIEW.md R2-15: `+'' === 0`, so empty/whitespace strings validated as
// numbers — clearing a numeric cell in TableBrowser silently wrote 0, and
// clearing a ListInteger cell wrote [0].
describe('blank-input coercion (regression: R2-15)', () => {
  it.each([
    [ValueTypeName.Integer, ''],
    [ValueTypeName.Integer, '   '],
    [ValueTypeName.Long, ''],
    [ValueTypeName.Double, ''],
    [ValueTypeName.Double, ' '],
  ])('rejects blank input for %s (%p)', (type, input) => {
    expect(serializedStringIsValid(type, input)).toBe(false)
  })

  it('accepts blank input for list types as an empty list', () => {
    expect(serializedStringIsValid(ValueTypeName.ListInteger, '')).toBe(true)
    expect(serializedStringIsValid(ValueTypeName.ListString, '  ')).toBe(true)
  })

  it('deserializes blank input to an empty list, not [0] or [""]', () => {
    expect(deserializeValueList(ValueTypeName.ListInteger, '')).toEqual([])
    expect(deserializeValueList(ValueTypeName.ListDouble, ' ')).toEqual([])
    expect(deserializeValueList(ValueTypeName.ListString, '')).toEqual([])
  })

  it('still accepts real numbers with surrounding whitespace', () => {
    expect(serializedStringIsValid(ValueTypeName.Double, ' 5 ')).toBe(true)
  })
})

// REVIEW.md R2-16: numeric list input required the exact ', ' separator —
// '1,2,3' was rejected. Non-string lists now tolerate whitespace variation
// around commas. (String lists must keep the strict ', ' delimiter: a bare
// comma may legitimately appear inside an element, and any tolerant split
// would corrupt it. Lossless round-trips for elements containing ', '
// itself would need an escaping scheme — an open product decision.)
describe('list separator tolerance (regression: R2-16)', () => {
  it('accepts and parses comma-separated numbers without spaces', () => {
    expect(serializedStringIsValid(ValueTypeName.ListInteger, '1,2,3')).toBe(
      true,
    )
    expect(deserializeValueList(ValueTypeName.ListInteger, '1,2, 3')).toEqual([
      1, 2, 3,
    ])
    expect(
      deserializeValueList(ValueTypeName.ListDouble, ' 1.5 , 2.5 '),
    ).toEqual([1.5, 2.5])
  })

  it('string lists keep the strict ", " delimiter so embedded commas survive', () => {
    expect(deserializeValueList(ValueTypeName.ListString, 'a,b, c')).toEqual([
      'a,b',
      'c',
    ])
  })

  it('KNOWN LIMITATION: a string element containing ", " cannot round-trip', () => {
    // serialize(['a, b', 'c']) === 'a, b, c', which deserializes to three
    // elements. Fixing this requires an escaping scheme (product decision);
    // this test pins the current lossy behavior. See REVIEW.md R2-16.
    const serialized = serializeValueList(['a, b', 'c'])
    expect(deserializeValueList(ValueTypeName.ListString, serialized)).toEqual([
      'a',
      'b',
      'c',
    ])
  })
})

// REVIEW.md R2-17: `(a ?? Infinity) - (b ?? -Infinity)` returned +Infinity
// for BOTH orderings of a defined and an undefined operand, violating
// comparator antisymmetry — sort order became engine-dependent. NaN
// operands returned NaN.
describe('compareNumbers comparator contract (regression: R2-17)', () => {
  const asAny = (v: unknown): number => v as number

  it('is antisymmetric for defined vs undefined operands', () => {
    expect(compareNumbers(asAny(undefined), 5, 'asc')).toBeGreaterThan(0)
    expect(compareNumbers(5, asAny(undefined), 'asc')).toBeLessThan(0)
  })

  it('puts undefined at the bottom for BOTH sort directions', () => {
    expect(compareNumbers(asAny(undefined), 5, 'desc')).toBeGreaterThan(0)
    expect(compareNumbers(5, asAny(undefined), 'desc')).toBeLessThan(0)
  })

  it('treats two missing values as equal', () => {
    expect(compareNumbers(asAny(undefined), asAny(undefined), 'asc')).toBe(0)
  })

  it('never returns NaN', () => {
    expect(Number.isNaN(compareNumbers(NaN, 5, 'asc'))).toBe(false)
    expect(Number.isNaN(compareNumbers(5, NaN, 'desc'))).toBe(false)
    expect(compareNumbers(NaN, 5, 'asc')).toBeGreaterThan(0) // NaN to bottom
  })

  it('sorts defined numbers normally', () => {
    expect(compareNumbers(1, 2, 'asc')).toBeLessThan(0)
    expect(compareNumbers(1, 2, 'desc')).toBeGreaterThan(0)
    expect(compareNumbers(3, 3, 'asc')).toBe(0)
  })
})
