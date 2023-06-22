import { ValueType } from '../../src/models/TableModel'
import { serializeValueList, serializedStringIsValid, compareLists, serializeValue, deserializeValueList} from '../../src/models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../src/models/TableModel'

describe('serializeValueList', () => {
  it('should return an empty string for an empty list', () => {
    const value: ValueType = []
    expect(serializeValueList(value)).toBe('')
  })

  it('should return a comma-separated string for a list of values', () => {
    const value: ValueType = [1, 2, 3]
    expect(serializeValueList(value)).toBe('1, 2, 3')
  })
})


describe('serializedStringIsValid', () => {
  it('should return true for a valid boolean serialized string', () => {
    const valueTypeName = ValueTypeName.Boolean
    const serializedString = 'true'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return false for an invalid boolean serialized string', () => {
    const valueTypeName = ValueTypeName.Boolean
    const serializedString = 'invalid'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(false)
  })

  it('should return true for a valid double serialized string', () => {
    const valueTypeName = ValueTypeName.Double
    const serializedString = '3.14'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return false for an invalid double serialized string', () => {
    const valueTypeName = ValueTypeName.Double
    const serializedString = 'invalid'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(false)
  })

  it('should return true for a valid long serialized string', () => {
    const valueTypeName = ValueTypeName.Long
    const serializedString = '1234567890'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return false for an invalid long serialized string', () => {
    const valueTypeName = ValueTypeName.Long
    const serializedString = 'invalid'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(false)
  })

  it('should return true for a valid integer serialized string', () => {
    const valueTypeName = ValueTypeName.Integer
    const serializedString = '123'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return false for an invalid integer serialized string', () => {
    const valueTypeName = ValueTypeName.Integer
    const serializedString = 'invalid'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(false)
  })

  it('should return true for a valid string serialized string', () => {
    const valueTypeName = ValueTypeName.String
    const serializedString = 'hello world'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return true for a valid list serialized string', () => {
    const valueTypeName = ValueTypeName.ListString
    const serializedString = 'one, two, three'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })

  it('should return true for a list of serialized string', () => {
    const valueTypeName = ValueTypeName.ListString
    const serializedString = 'one, two, invalid'
    expect(serializedStringIsValid(valueTypeName, serializedString)).toBe(true)
  })
})

describe('serializeValue', () => {
  it('should serialize a string value', () => {
    const value = 'hello world'
    expect(serializeValue(value)).toBe('hello world')
  })

  it('should serialize a number value', () => {
    const value = 123
    expect(serializeValue(value)).toBe('123')
  })

  it('should serialize a boolean value', () => {
    const value = true
    expect(serializeValue(value)).toBe('true')
  })

  it('should serialize an array value', () => {
    const value = ['one', 'two', 'three']
    expect(serializeValue(value)).toBe('one, two, three')
  })
})


describe('deserializeValueList', () => {
  it('should deserialize a list of string values', () => {
    const type = ValueTypeName.ListString
    const value = 'one, two, three'
    expect(deserializeValueList(type, value)).toEqual(['one', 'two', 'three'])
  })

  it('should deserialize a list of long values', () => {
    const type = ValueTypeName.ListLong
    const value = '1, 2, 3'
    expect(deserializeValueList(type, value)).toEqual([1, 2, 3])
  })

  it('should deserialize a list of integer values', () => {
    const type = ValueTypeName.ListInteger
    const value = '1, 2, 3'
    expect(deserializeValueList(type, value)).toEqual([1, 2, 3])
  })

  it('should deserialize a list of double values', () => {
    const type = ValueTypeName.ListDouble
    const value = '1.1, 2.2, 3.3'
    expect(deserializeValueList(type, value)).toEqual([1.1, 2.2, 3.3])
  })

  it('should deserialize a list of boolean values', () => {
    const type = ValueTypeName.ListBoolean
    const value = 'true, false, true'
    expect(deserializeValueList(type, value)).toEqual([true, false, true])
  })
})

describe('compareLists', () => {
  it('should compare two lists of string values', () => {
    const sortDirection = 'asc'
    const a = ['one', 'two', 'three']
    const b = ['four', 'five', 'six']
    expect(compareLists(a, b, sortDirection)).toBe(1)
  })

  it('should compare two lists of long values', () => {
    const sortDirection = 'asc'
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    expect(compareLists(a, b, sortDirection)).toBeLessThan(0)
  })

  it('should compare two lists of integer values', () => {
    const sortDirection = 'asc'
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    expect(compareLists(a, b, sortDirection)).toBeLessThan(0)
  })

  it('should compare two lists of double values', () => {
    const sortDirection = 'asc'
    const a = [1.1, 2.2, 3.3]
    const b = [4.4, 5.5, 6.6]
    expect(compareLists(a, b, sortDirection)).toBeLessThan(0)
  })

  it('should compare two lists of boolean values', () => {
    const sortDirection = 'asc'
    const a = [true, false, true]
    const b = [false, true, false]
    expect(compareLists(a, b, sortDirection)).toBeGreaterThan(0)
  })
})