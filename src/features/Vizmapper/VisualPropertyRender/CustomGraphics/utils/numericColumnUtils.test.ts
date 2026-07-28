import { describe, expect, it } from 'vitest'

import type { Column } from '../../../../../models/TableModel/Column'
import type { ValueType } from '../../../../../models/TableModel/ValueType'
import { ValueTypeName } from '../../../../../models/TableModel/ValueTypeName'
import {
  getNumericColumnNames,
  hasNumericColumns,
  isNumericColumn,
} from './numericColumnUtils'

const col = (name: string, type: ValueTypeName): Column => ({ name, type })

const rowsFrom = (
  records: Record<string, ValueType>[],
): Map<string, Record<string, ValueType>> =>
  new Map(records.map((r, i) => [`row-${i}`, r]))

describe('isNumericColumn', () => {
  it.each([
    [ValueTypeName.Integer],
    [ValueTypeName.Double],
    [ValueTypeName.Long],
  ])('accepts a %s-typed column regardless of values', (type) => {
    expect(isNumericColumn(col('c', type), ['not-a-number'])).toBe(true)
  })

  it('accepts a string-typed column whose values are all numbers', () => {
    expect(isNumericColumn(col('c', ValueTypeName.String), [1, 2.5, -3])).toBe(
      true,
    )
  })

  it('ignores null and undefined values when checking', () => {
    expect(
      isNumericColumn(col('c', ValueTypeName.String), [1, null, undefined, 2]),
    ).toBe(true)
  })

  it('rejects a string column with any non-numeric value', () => {
    expect(isNumericColumn(col('c', ValueTypeName.String), [1, 'two'])).toBe(
      false,
    )
  })

  it('rejects a column with no non-null values, even a numeric-typed one', () => {
    expect(isNumericColumn(col('c', ValueTypeName.Integer), [])).toBe(false)
    expect(
      isNumericColumn(col('c', ValueTypeName.Integer), [null, undefined]),
    ).toBe(false)
  })
})

describe('getNumericColumnNames', () => {
  const columns = [
    col('score', ValueTypeName.Double),
    col('name', ValueTypeName.String),
    col('degree', ValueTypeName.String), // numeric by value, not by type
  ]
  const rows = rowsFrom([
    { score: 0.5, name: 'a', degree: 3 },
    { score: 1.5, name: 'b', degree: 7 },
  ])

  it('returns columns that are numeric by type or by value', () => {
    expect(getNumericColumnNames(columns, rows)).toEqual(['score', 'degree'])
  })

  it('returns an empty list for empty rows', () => {
    expect(getNumericColumnNames(columns, new Map())).toEqual([])
  })
})

describe('hasNumericColumns', () => {
  it('is true when at least one column is numeric', () => {
    expect(
      hasNumericColumns(
        [col('name', ValueTypeName.String), col('n', ValueTypeName.Integer)],
        rowsFrom([{ name: 'a', n: 1 }]),
      ),
    ).toBe(true)
  })

  it('is false for undefined columns, undefined rows, or empty rows', () => {
    const columns = [col('n', ValueTypeName.Integer)]
    expect(hasNumericColumns(undefined, rowsFrom([{ n: 1 }]))).toBe(false)
    expect(hasNumericColumns(columns, undefined)).toBe(false)
    expect(hasNumericColumns(columns, new Map())).toBe(false)
  })

  it('is false when no column qualifies', () => {
    expect(
      hasNumericColumns(
        [col('name', ValueTypeName.String)],
        rowsFrom([{ name: 'a' }]),
      ),
    ).toBe(false)
  })
})
