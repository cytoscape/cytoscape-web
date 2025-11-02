import {
  serializeValueList,
  serializedStringIsValid,
  compareLists,
  serializeValue,
  deserializeValueList,
} from '../../src/models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../src/models/TableModel'

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
