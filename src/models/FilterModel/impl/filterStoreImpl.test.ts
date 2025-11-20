import { IdType } from '../../IdType'
import { GraphObjectType } from '../../NetworkModel'
import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { ValueType } from '../../TableModel'
import { DisplayMode } from '../DisplayMode'
import { FilterConfig } from '../FilterConfig'
import { SearchState } from '../SearchState'
import {
  addFilterConfig,
  deleteFilterConfig,
  FilterState,
  getIndex,
  setConverter,
  setIndex,
  setIndexedColumns,
  setOptions,
  setQuery,
  setSearchState,
  updateFilterConfig,
  updateRange,
} from './filterStoreImpl'

const createDefaultState = (): FilterState<any> => {
  return {
    search: {
      state: SearchState.READY,
      query: '',
      indexedColumns: {},
      options: {
        exact: true,
        operator: 'OR',
      },
      convertResults: (result: any[]) => result,
      index: {},
    },
    filterConfigs: {},
  }
}

const createTestFilterConfig = (name: string): FilterConfig => {
  return {
    name,
    target: GraphObjectType.NODE,
    attributeName: 'col1',
    label: `Filter ${name}`,
    description: 'Test filter',
    widgetType: 'slider',
    displayMode: DisplayMode.SELECT,
    range: { min: 0, max: 100 },
  }
}

describe('FilterStoreImpl', () => {
  describe('setSearchState', () => {
    it('should set search state', () => {
      const state = createDefaultState()

      const result = setSearchState(state, SearchState.READY)

      expect(result.search.state).toBe(SearchState.READY)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('setQuery', () => {
    it('should set query', () => {
      const state = createDefaultState()

      const result = setQuery(state, 'test query')

      expect(result.search.query).toBe('test query')
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('setIndexedColumns', () => {
    it('should set indexed columns for a network and type', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'

      const result = setIndexedColumns(
        state,
        networkId,
        GraphObjectType.NODE,
        ['col1', 'col2'],
      )

      expect(result.search.indexedColumns[networkId]?.node).toEqual([
        'col1',
        'col2',
      ])
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('setIndex', () => {
    it('should set index for a network and type', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const index = { key1: ['value1'], key2: ['value2'] }

      const result = setIndex(state, networkId, GraphObjectType.NODE, index)

      const retrievedIndex = getIndex(result, networkId, GraphObjectType.NODE)
      expect(retrievedIndex).toEqual(index)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('getIndex', () => {
    it('should get index for a network and type', () => {
      const state = createDefaultState()
      const networkId: IdType = 'network-1'
      const index = { key1: ['value1'] }

      const stateWithIndex = setIndex(state, networkId, GraphObjectType.NODE, index)

      const retrievedIndex = getIndex(
        stateWithIndex,
        networkId,
        GraphObjectType.NODE,
      )
      expect(retrievedIndex).toEqual(index)
    })

    it('should return undefined if index does not exist', () => {
      const state = createDefaultState()

      const retrievedIndex = getIndex(
        state,
        'non-existent' as IdType,
        GraphObjectType.NODE,
      )
      expect(retrievedIndex).toBeUndefined()
    })
  })

  describe('setConverter', () => {
    it('should set converter function', () => {
      const state = createDefaultState()
      const converter = jest.fn((result: any) => result)

      const result = setConverter(state, converter)

      expect(result.search.convertResults).toBe(converter)
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('setOptions', () => {
    it('should set search options', () => {
      const state = createDefaultState()

      const result = setOptions(state, { exact: false, operator: 'AND' })

      expect(result.search.options.exact).toBe(false)
      expect(result.search.options.operator).toBe('AND')
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('addFilterConfig', () => {
    it('should add a filter config', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')

      const result = addFilterConfig(state, filter)

      expect(result.filterConfigs['filter-1']).toEqual(filter)
      expect(result).not.toBe(state) // Immutability check
    })

    it('should not add duplicate filter config', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')

      let result = addFilterConfig(state, filter)
      result = addFilterConfig(result, filter)

      // Should only have one
      expect(Object.keys(result.filterConfigs)).toHaveLength(1)
      expect(result).toBe(result) // Second add should return unchanged
    })
  })

  describe('deleteFilterConfig', () => {
    it('should delete a filter config', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')

      let result = addFilterConfig(state, filter)
      result = deleteFilterConfig(result, 'filter-1')

      expect(result.filterConfigs['filter-1']).toBeUndefined()
      expect(result).not.toBe(state) // Immutability check
    })
  })

  describe('updateFilterConfig', () => {
    it('should update a filter config', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')
      const updatedFilter: FilterConfig = {
        ...filter,
        attributeName: 'col2',
        range: { min: 0, max: 200 },
      }

      let result = addFilterConfig(state, filter)
      result = updateFilterConfig(result, 'filter-1', updatedFilter)

      expect(result.filterConfigs['filter-1']).toEqual(updatedFilter)
    })
  })

  describe('updateRange', () => {
    it('should update range for a filter config', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')
      const newRange: NumberRange = { min: 10, max: 90 }

      let result = addFilterConfig(state, filter)
      result = updateRange(result, 'filter-1', newRange)

      expect(result.filterConfigs['filter-1'].range).toEqual(newRange)
    })

    it('should handle discrete range', () => {
      const state = createDefaultState()
      const filter = createTestFilterConfig('filter-1')
      const newRange: DiscreteRange<ValueType> = {
        values: ['value1', 'value2'],
      }

      let result = addFilterConfig(state, filter)
      result = updateRange(result, 'filter-1', newRange)

      expect(result.filterConfigs['filter-1'].range).toEqual(newRange)
    })

    it('should handle non-existent filter gracefully', () => {
      const state = createDefaultState()
      const newRange: NumberRange = { min: 10, max: 90 }

      const result = updateRange(state, 'non-existent', newRange)

      expect(result).toBe(state) // Should return unchanged
    })
  })

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const original = createDefaultState()
      const originalSearch = original.search
      const originalFilterConfigs = original.filterConfigs

      let state = setSearchState(original, SearchState.READY)
      state = setQuery(state, 'test')
      state = addFilterConfig(state, createTestFilterConfig('filter-1'))
      state = updateRange(state, 'filter-1', { min: 10, max: 90 })
      state = deleteFilterConfig(state, 'filter-1')

      // Verify original is unchanged
      expect(original.search).toBe(originalSearch)
      expect(original.filterConfigs).toBe(originalFilterConfigs)
      expect(original.search.query).toBe('')
      expect(original.filterConfigs).toEqual({})
    })
  })
})

