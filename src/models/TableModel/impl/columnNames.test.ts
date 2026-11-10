// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../ValueTypeName'
import {
  assertSameColumnType,
  ColumnTypeConflictError,
  columnNameIsTaken,
  columnNamesMatch,
  findColumnByName,
  isIdColumnName,
  mergeDeclaredColumns,
  setCellValue,
} from './columnNames'

const col = (name: string, type: ValueTypeName = ValueTypeName.String) => ({
  name,
  type,
})

describe('column name rules', () => {
  it('matches names ignoring case', () => {
    expect(columnNamesMatch('Name', 'nAME')).toBe(true)
    expect(columnNamesMatch('name', 'names')).toBe(false)
  })

  it.each(['id', 'ID', 'Id', 'iD'])('treats %s as the id key', (name) => {
    expect(isIdColumnName(name)).toBe(true)
  })

  it('does not treat other names as the id key', () => {
    expect(isIdColumnName('identifier')).toBe(false)
    expect(isIdColumnName('')).toBe(false)
  })

  describe('columnNameIsTaken', () => {
    const columns = [col('foo'), col('bar')]

    it('finds exact and case-variant names', () => {
      expect(columnNameIsTaken(columns, 'foo')).toBe(true)
      expect(columnNameIsTaken(columns, 'FOO')).toBe(true)
      expect(columnNameIsTaken(columns, 'baz')).toBe(false)
    })

    it('does not count the column being renamed', () => {
      expect(columnNameIsTaken(columns, 'Foo', 'foo')).toBe(false)
      expect(columnNameIsTaken(columns, 'BAR', 'foo')).toBe(true)
    })

    it('counts a second column of the same name in a saved table', () => {
      expect(columnNameIsTaken([col('foo'), col('foo')], 'Foo', 'foo')).toBe(
        true,
      )
    })

    it('is empty-safe', () => {
      expect(columnNameIsTaken([], 'foo')).toBe(false)
    })

    it('does not match Object.prototype members', () => {
      expect(columnNameIsTaken(columns, 'constructor')).toBe(false)
      expect(columnNameIsTaken(columns, '__proto__')).toBe(false)
    })
  })

  describe('findColumnByName', () => {
    it('prefers the exact spelling over an earlier case variant', () => {
      expect(findColumnByName([col('NAME'), col('name')], 'name')).toEqual(
        col('name'),
      )
    })

    it('falls back to a case variant', () => {
      expect(findColumnByName([col('name')], 'NAME')).toEqual(col('name'))
    })

    it('is undefined when nothing matches', () => {
      expect(findColumnByName([col('name')], 'other')).toBeUndefined()
    })
  })

  describe('mergeDeclaredColumns', () => {
    it('keeps the first spelling and type, in declaration order', () => {
      const merge = mergeDeclaredColumns([
        col('b'),
        col('a', ValueTypeName.Long),
        col('A'),
      ])

      expect(merge.columns).toEqual([col('b'), col('a', ValueTypeName.Long)])
      expect(merge.hasDuplicates).toBe(true)
      expect(merge.keptColumn('A')).toEqual(col('a', ValueTypeName.Long))
      expect(merge.isMerged('A')).toBe(true)
      expect(merge.isMerged('b')).toBe(false)
    })

    it('reports no duplicates when there are none', () => {
      const merge = mergeDeclaredColumns([col('a'), col('b')])

      expect(merge.hasDuplicates).toBe(false)
      expect(merge.isMerged('a')).toBe(false)
      expect(merge.keptColumn('missing')).toBeUndefined()
    })

    it('handles empty input', () => {
      const merge = mergeDeclaredColumns([])

      expect(merge.columns).toEqual([])
      expect(merge.hasDuplicates).toBe(false)
    })

    it('uses no object lookup for names like __proto__', () => {
      const merge = mergeDeclaredColumns([
        col('__proto__'),
        col('__PROTO__'),
        col('constructor'),
      ])

      expect(merge.columns.map((c) => c.name)).toEqual([
        '__proto__',
        'constructor',
      ])
      expect(merge.keptColumn('toString')).toBeUndefined()
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })
  })

  describe('assertSameColumnType', () => {
    it('accepts the same type', () => {
      expect(() => assertSameColumnType(col('a'), col('A'))).not.toThrow()
    })

    it('throws a typed error naming both columns', () => {
      const act = () =>
        assertSameColumnType(col('a'), col('A', ValueTypeName.Long))

      expect(act).toThrow(ColumnTypeConflictError)
      expect(act).toThrow(/"A" \(long\).*"a" \(string\)/)
    })
  })

  describe('setCellValue', () => {
    it('writes an ordinary cell', () => {
      const row = {}
      setCellValue(row, 'name', 'a')
      expect(row).toEqual({ name: 'a' })
    })

    it('stores __proto__ as an own key and keeps the prototype', () => {
      const row = {}
      setCellValue(row, '__proto__', ['polluted'])

      expect(Object.getPrototypeOf(row)).toBe(Object.prototype)
      expect(Object.keys(row)).toEqual(['__proto__'])
    })
  })
})
