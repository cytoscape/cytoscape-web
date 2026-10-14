// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../../models/TableModel/ValueTypeName'
import {
  addItem,
  coerceElement,
  elementType,
  removeItem,
  toEditableItems,
  updateItem,
  validateAndBuildListValue,
} from './listCellEditor'

describe('listCellEditor helpers (CW-563)', () => {
  describe('toEditableItems', () => {
    it('returns [] for null/undefined', () => {
      expect(toEditableItems(null)).toEqual([])
      expect(toEditableItems(undefined)).toEqual([])
    })

    it('maps array elements to strings', () => {
      expect(toEditableItems(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
      expect(toEditableItems([1, 2, 3])).toEqual(['1', '2', '3'])
      expect(toEditableItems([true, false])).toEqual(['true', 'false'])
    })

    it('wraps a non-array value into a single element', () => {
      expect(toEditableItems('lonely')).toEqual(['lonely'])
      expect(toEditableItems(42)).toEqual(['42'])
    })
  })

  describe('add/remove/update are pure', () => {
    it('addItem appends without mutating', () => {
      const original = ['a']
      const next = addItem(original, 'b')
      expect(next).toEqual(['a', 'b'])
      expect(original).toEqual(['a'])
    })

    it('addItem defaults to a blank element', () => {
      expect(addItem(['a'])).toEqual(['a', ''])
    })

    it('removeItem removes by index without mutating', () => {
      const original = ['a', 'b', 'c']
      const next = removeItem(original, 1)
      expect(next).toEqual(['a', 'c'])
      expect(original).toEqual(['a', 'b', 'c'])
    })

    it('updateItem replaces by index without mutating', () => {
      const original = ['a', 'b', 'c']
      const next = updateItem(original, 2, 'z')
      expect(next).toEqual(['a', 'b', 'z'])
      expect(original).toEqual(['a', 'b', 'c'])
    })
  })

  describe('elementType', () => {
    it('maps list types to their element type', () => {
      expect(elementType(ValueTypeName.ListString)).toBe(ValueTypeName.String)
      expect(elementType(ValueTypeName.ListLong)).toBe(ValueTypeName.Long)
      expect(elementType(ValueTypeName.ListDouble)).toBe(ValueTypeName.Double)
      expect(elementType(ValueTypeName.ListBoolean)).toBe(ValueTypeName.Boolean)
    })
  })

  describe('coerceElement', () => {
    it('coerces booleans', () => {
      expect(coerceElement('true', ValueTypeName.Boolean)).toBe(true)
      expect(coerceElement('false', ValueTypeName.Boolean)).toBe(false)
      expect(coerceElement(' true ', ValueTypeName.Boolean)).toBe(true)
    })

    it('coerces numbers', () => {
      expect(coerceElement('42', ValueTypeName.Long)).toBe(42)
      expect(coerceElement('3.5', ValueTypeName.Double)).toBe(3.5)
      expect(coerceElement(' 7 ', ValueTypeName.Integer)).toBe(7)
    })

    it('leaves strings intact (no trimming)', () => {
      expect(coerceElement(' hi ', ValueTypeName.String)).toBe(' hi ')
    })
  })

  describe('validateAndBuildListValue', () => {
    it('builds a string list, dropping blank rows', () => {
      const result = validateAndBuildListValue(
        ['alice', 'bob', '   '],
        ValueTypeName.ListString,
      )
      // whitespace-only is blank for a string element too and is dropped
      expect(result.errors).toEqual({})
      expect(result.value).toEqual(['alice', 'bob'])
    })

    it('drops blank rows between filled string elements', () => {
      const result = validateAndBuildListValue(
        ['a', '', 'b'],
        ValueTypeName.ListString,
      )
      expect(result.value).toEqual(['a', 'b'])
    })

    it('does not trim the interior of a non-blank string element', () => {
      const result = validateAndBuildListValue(
        ['  hello world  '],
        ValueTypeName.ListString,
      )
      expect(result.value).toEqual(['  hello world  '])
    })

    it('does not split single values on comma (the CW-563 bug)', () => {
      // Old behavior split "a,b,c" on ", " producing a single element.
      // Here each element is its own row, so a value containing commas is
      // preserved as one element.
      const result = validateAndBuildListValue(
        ['a,b,c'],
        ValueTypeName.ListString,
      )
      expect(result.value).toEqual(['a,b,c'])
    })

    it('coerces a numeric list and drops the trailing blank add-row', () => {
      const result = validateAndBuildListValue(
        ['1', '2', '3', ''],
        ValueTypeName.ListLong,
      )
      expect(result.errors).toEqual({})
      expect(result.value).toEqual([1, 2, 3])
    })

    it('coerces a boolean list', () => {
      const result = validateAndBuildListValue(
        ['true', 'false', 'true'],
        ValueTypeName.ListBoolean,
      )
      expect(result.value).toEqual([true, false, true])
    })

    it('reports an error for an invalid numeric element and returns null value', () => {
      const result = validateAndBuildListValue(
        ['1', 'notanumber', '3'],
        ValueTypeName.ListDouble,
      )
      expect(result.value).toBeNull()
      expect(result.errors[1]).toContain('not a valid double')
    })

    it('rejects a non-integer in an integer list', () => {
      const result = validateAndBuildListValue(
        ['1', '2.5'],
        ValueTypeName.ListInteger,
      )
      expect(result.value).toBeNull()
      expect(result.errors[1]).toBeDefined()
    })

    it('returns an error when given a non-list type', () => {
      const result = validateAndBuildListValue(['a'], ValueTypeName.String)
      expect(result.value).toBeNull()
      expect(Object.keys(result.errors).length).toBeGreaterThan(0)
    })

    it('builds an empty list when all rows are blank', () => {
      const result = validateAndBuildListValue(
        ['', '  '],
        ValueTypeName.ListLong,
      )
      expect(result.value).toEqual([])
      expect(result.errors).toEqual({})
    })
  })
})
