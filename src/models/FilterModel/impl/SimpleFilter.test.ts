import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { createTable } from '../../TableModel/impl/InMemoryTable'
import { Filter } from '../Filter'
import { getBasicFilter } from './SimpleFilter'

// to run these: npx jest src/models/FilterModel/impl/SimpleFilter.test.ts

describe('SimpleFilter', () => {
  let filter: Filter

  beforeEach(() => {
    filter = getBasicFilter()
  })

  describe('getBasicFilter', () => {
    it('should return a filter instance', () => {
      const filter = getBasicFilter()

      expect(filter).toBeDefined()
      expect(filter.applyDiscreteFilter).toBeDefined()
      expect(filter.applyNumericFilter).toBeDefined()
    })
  })

  describe('applyDiscreteFilter', () => {
    it('should return empty array when range is empty', () => {
      const table = createTable('test-table', [
        { name: 'status', type: 'string' },
      ])
      table.rows.set('1', { status: 'active' })
      table.rows.set('2', { status: 'inactive' })

      const range: DiscreteRange<string> = { values: [] }
      const result = filter.applyDiscreteFilter(range, table, 'status')

      expect(result).toEqual([])
    })

    it('should return ids that match discrete values', () => {
      const table = createTable('test-table', [
        { name: 'status', type: 'string' },
      ])
      table.rows.set('1', { status: 'active' })
      table.rows.set('2', { status: 'inactive' })
      table.rows.set('3', { status: 'active' })
      table.rows.set('4', { status: 'pending' })

      const range: DiscreteRange<string> = { values: ['active', 'inactive'] }
      const result = filter.applyDiscreteFilter(range, table, 'status')

      expect(result).toHaveLength(3)
      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
      expect(result).not.toContain('4')
    })

    it('should handle numeric discrete values', () => {
      const table = createTable('test-table', [
        { name: 'type', type: 'integer' },
      ])
      table.rows.set('1', { type: 1 })
      table.rows.set('2', { type: 2 })
      table.rows.set('3', { type: 1 })
      table.rows.set('4', { type: 3 })

      const range: DiscreteRange<number> = { values: [1, 2] }
      const result = filter.applyDiscreteFilter(range, table, 'type')

      expect(result).toHaveLength(3)
      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
      expect(result).not.toContain('4')
    })

    it('should return empty array when no rows match', () => {
      const table = createTable('test-table', [
        { name: 'status', type: 'string' },
      ])
      table.rows.set('1', { status: 'active' })
      table.rows.set('2', { status: 'inactive' })

      const range: DiscreteRange<string> = { values: ['pending', 'deleted'] }
      const result = filter.applyDiscreteFilter(range, table, 'status')

      expect(result).toEqual([])
    })

    it('should handle missing attribute values', () => {
      const table = createTable('test-table', [
        { name: 'status', type: 'string' },
        { name: 'other', type: 'string' },
      ])
      table.rows.set('1', { status: 'active' })
      table.rows.set('2', { other: 'value' }) // Missing 'status'
      table.rows.set('3', { status: 'inactive' })

      const range: DiscreteRange<string> = { values: ['active', 'inactive'] }
      const result = filter.applyDiscreteFilter(range, table, 'status')

      expect(result).toHaveLength(2)
      expect(result).toContain('1')
      expect(result).toContain('3')
      expect(result).not.toContain('2')
    })

    it('should handle boolean discrete values', () => {
      const table = createTable('test-table', [
        { name: 'isActive', type: 'boolean' },
      ])
      table.rows.set('1', { isActive: true })
      table.rows.set('2', { isActive: false })
      table.rows.set('3', { isActive: true })

      const range: DiscreteRange<boolean> = { values: [true] }
      const result = filter.applyDiscreteFilter(range, table, 'isActive')

      expect(result).toHaveLength(2)
      expect(result).toContain('1')
      expect(result).toContain('3')
      expect(result).not.toContain('2')
    })
  })

  describe('applyNumericFilter', () => {
    it('should return ids with values within range', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10, id: '1' })
      table.rows.set('2', { score: 20, id: '2' })
      table.rows.set('3', { score: 30, id: '3' })
      table.rows.set('4', { score: 40, id: '4' })

      const range: NumberRange = { min: 15, max: 35 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toHaveLength(2)
      expect(result).toContain('2')
      expect(result).toContain('3')
      expect(result).not.toContain('1')
      expect(result).not.toContain('4')
    })

    it('should include values at range boundaries', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10, id: '1' })
      table.rows.set('2', { score: 20, id: '2' })
      table.rows.set('3', { score: 30, id: '3' })

      const range: NumberRange = { min: 10, max: 30 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toHaveLength(3)
      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
    })

    it('should return empty array when no values in range', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10, id: '1' })
      table.rows.set('2', { score: 20, id: '2' })

      const range: NumberRange = { min: 50, max: 100 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toEqual([])
    })

    it('should handle single value range', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10, id: '1' })
      table.rows.set('2', { score: 20, id: '2' })

      const range: NumberRange = { min: 20, max: 20 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toHaveLength(1)
      expect(result).toContain('2')
    })

    it('should handle negative values', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: -10, id: '1' })
      table.rows.set('2', { score: -5, id: '2' })
      table.rows.set('3', { score: 0, id: '3' })
      table.rows.set('4', { score: 5, id: '4' })

      const range: NumberRange = { min: -10, max: 0 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toHaveLength(3)
      expect(result).toContain('1')
      expect(result).toContain('2')
      expect(result).toContain('3')
      expect(result).not.toContain('4')
    })

    it('should handle decimal values', () => {
      const table = createTable('test-table', [
        { name: 'score', type: 'double' },
      ])
      table.rows.set('1', { score: 10.5, id: '1' })
      table.rows.set('2', { score: 20.3, id: '2' })
      table.rows.set('3', { score: 30.7, id: '3' })

      const range: NumberRange = { min: 15.0, max: 25.0 }
      const result = filter.applyNumericFilter(range, table, 'score')

      expect(result).toHaveLength(1)
      expect(result).toContain('2')
    })
  })
})

