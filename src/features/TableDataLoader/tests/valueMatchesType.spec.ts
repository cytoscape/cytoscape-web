import { ValueTypeName } from '../../../models/TableModel'
import { DelimiterType } from '../model/DelimiterType'
import { valueMatchesType } from '../model/impl/ParseValues'

describe('valueMatchesType', () => {
  it('returns true for string value and ValueTypeName.String', () => {
    const result = valueMatchesType('hello', ValueTypeName.String)
    expect(result).toBe(true)
  })

  it('returns true for integer value and ValueTypeName.Integer', () => {
    const result = valueMatchesType('123', ValueTypeName.Integer)
    expect(result).toBe(true)
  })

  it('returns true for long value and ValueTypeName.Long', () => {
    const result = valueMatchesType('1234567890', ValueTypeName.Long)
    expect(result).toBe(true)
  })

  it('returns true for double value and ValueTypeName.Double', () => {
    const result = valueMatchesType('3.14', ValueTypeName.Double)
    expect(result).toBe(true)
  })

  it('returns true for boolean value and ValueTypeName.Boolean', () => {
    const result = valueMatchesType('true', ValueTypeName.Boolean)
    expect(result).toBe(true)
  })

  it('returns true for list of strings value and ValueTypeName.ListString', () => {
    const result = valueMatchesType(
      'apple,banana,orange',
      ValueTypeName.ListString,
      DelimiterType.Comma,
    )
    expect(result).toBe(true)
  })

  it('returns true for list of integers value and ValueTypeName.ListInteger', () => {
    const result = valueMatchesType(
      '1,2,3',
      ValueTypeName.ListInteger,
      DelimiterType.Comma,
    )
    expect(result).toBe(true)
  })

  it('returns true for list of longs value and ValueTypeName.ListLong', () => {
    const result = valueMatchesType(
      '1234567890,9876543210',
      ValueTypeName.ListLong,
      DelimiterType.Comma,
    )
    expect(result).toBe(true)
  })

  it('returns true for list of doubles value and ValueTypeName.ListDouble', () => {
    const result = valueMatchesType(
      '1.23,4.56,7.89',
      ValueTypeName.ListDouble,
      DelimiterType.Comma,
    )
    expect(result).toBe(true)
  })

  it('returns true for list of booleans value and ValueTypeName.ListBoolean', () => {
    const result = valueMatchesType(
      'true,false,true',
      ValueTypeName.ListBoolean,
      DelimiterType.Comma,
    )
    expect(result).toBe(true)
  })

  it('returns false for invalid value and any other ValueTypeName', () => {
    const result = valueMatchesType('invalid', '' as ValueTypeName)
    expect(result).toBe(false)
  })
})
