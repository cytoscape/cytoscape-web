import { ValueTypeName } from '../../../models/TableModel'
import { inferColumnType, valueMatchesType } from '../model/inferType'

describe('inferColumnType', () => {
  it('infers string type', () => {
    const values = ['foo', 'bar']
    const result = inferColumnType(values)
    expect(result.inferredType).toBe(ValueTypeName.String)
  })

  it('infers integer type', () => {
    const values = ['1', '2', '-3']
    const result = inferColumnType(values)
    expect(result.inferredType).toBe(ValueTypeName.Integer)
  })

  it('infers double type', () => {
    const values = ['1.5', '2.25', '-3.125']
    const result = inferColumnType(values)
    expect(result.inferredType).toBe(ValueTypeName.Double)
  })

  it('infers boolean type', () => {
    const values = ['true', 'false', 'True', 'False']
    const result = inferColumnType(values)
    expect(result.inferredType).toBe(ValueTypeName.Boolean)
  })

  it('infers list of string type', () => {
    const values = ['[foo,bar]', '[baz,qux]']
    const result = inferColumnType(values)
    expect(result.inferredType).toBe(ValueTypeName.ListString)
  })

  // TODO: Add more test cases
})

describe('valueMatchesType', () => {
  it('matches string type', () => {
    expect(valueMatchesType('foo', 'string')).toBe(true)
  })

  it('matches integer type', () => {
    expect(valueMatchesType('123', 'integer')).toBe(true)
  })

  it('matches double type', () => {
    expect(valueMatchesType('1.23', 'double')).toBe(true)
  })

  it('matches boolean type', () => {
    expect(valueMatchesType('true', 'boolean')).toBe(true)
  })

  it('does not match incorrect string type', () => {
    expect(valueMatchesType('123', 'string')).toBe(false)
  })

  it('does not match incorrect integer type', () => {
    expect(valueMatchesType('foo', 'integer')).toBe(false)
  })

  it('does not match incorrect double type', () => {
    expect(valueMatchesType('true', 'double')).toBe(false)
  })

  it('does not match incorrect boolean type', () => {
    expect(valueMatchesType('123', 'boolean')).toBe(false)
  })
})
