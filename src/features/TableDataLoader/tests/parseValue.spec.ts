import { ValueTypeName } from '../../../models/TableModel'
import { parseValue } from '../model/impl/ParseValues'

describe('parseValue', () => {
  it('parses string value correctly', () => {
    const value = 'John'
    const type = ValueTypeName.String
    const result = parseValue(value, type)
    expect(result).toEqual(value)
  })

  it('parses integer value correctly', () => {
    const value = '42'
    const type = ValueTypeName.Integer
    const result = parseValue(value, type)
    expect(result).toEqual(42)
  })

  it('parses long value correctly', () => {
    const value = '1234567890'
    const type = ValueTypeName.Long
    const result = parseValue(value, type)
    expect(result).toEqual(1234567890)
  })

  it('parses double value correctly', () => {
    const value = '3.14'
    const type = ValueTypeName.Double
    const result = parseValue(value, type)
    expect(result).toEqual(3.14)
  })

  it('parses boolean value correctly', () => {
    const value = 'true'
    const type = ValueTypeName.Boolean
    const result = parseValue(value, type)
    expect(result).toEqual(true)
  })

  it('parses list of string values correctly', () => {
    const value = 'apple,banana,orange'
    const type = ValueTypeName.ListString
    const result = parseValue(value, type, ',')
    expect(result).toEqual(['apple', 'banana', 'orange'])
  })

  it('parses list of integer values correctly', () => {
    const value = '1,2,3'
    const type = ValueTypeName.ListInteger
    const result = parseValue(value, type, ',')
    expect(result).toEqual([1, 2, 3])
  })

  it('parses list of long values correctly', () => {
    const value = '1000000000,2000000000,3000000000'
    const type = ValueTypeName.ListLong
    const result = parseValue(value, type, ',')
    expect(result).toEqual([1000000000, 2000000000, 3000000000])
  })

  it('parses list of double values correctly', () => {
    const value = '1.23,4.56,7.89'
    const type = ValueTypeName.ListDouble
    const result = parseValue(value, type, ',')
    expect(result).toEqual([1.23, 4.56, 7.89])
  })

  it('parses list of boolean values correctly', () => {
    const value = 'true,false,true'
    const type = ValueTypeName.ListBoolean
    const result = parseValue(value, type, ',')
    expect(result).toEqual([true, false, true])
  })

  it('returns value as is for unknown type', () => {
    const value = 'unknown'
    const type = 'UnknownType'
    const result = parseValue(value, type as ValueTypeName)
    expect(result).toEqual(value)
  })
})
