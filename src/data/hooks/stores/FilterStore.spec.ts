import { act, renderHook } from '@testing-library/react'

import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import { FilterConfig } from '../../../models/FilterModel/FilterConfig'
import { SearchState } from '../../../models/FilterModel/SearchState'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { DiscreteRange } from '../../../models/PropertyModel/DiscreteRange'
import { NumberRange } from '../../../models/PropertyModel/NumberRange'
import { ValueType } from '../../../models/TableModel'
import { useFilterStore } from './FilterStore'

// Mock the database operations
jest.mock('../../db', () => ({
  ...jest.requireActual('../../db'),
  putFilterToDb: jest.fn().mockResolvedValue(undefined),
  deleteFilterFromDb: jest.fn().mockResolvedValue(undefined),
}))

describe('useFilterStore', () => {
  describe('setSearchState', () => {
    it('should set search state', () => {
      const { result } = renderHook(() => useFilterStore())

      act(() => {
        result.current.setSearchState(SearchState.READY)
      })

      expect(result.current.search.state).toBe(SearchState.READY)
    })
  })

  describe('setQuery', () => {
    it('should set query', () => {
      const { result } = renderHook(() => useFilterStore())

      act(() => {
        result.current.setQuery('test query')
      })

      expect(result.current.search.query).toBe('test query')
    })
  })

  describe('setIndexedColumns', () => {
    it('should set indexed columns for a network and type', () => {
      const { result } = renderHook(() => useFilterStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.setIndexedColumns(networkId, GraphObjectType.NODE, [
          'col1',
          'col2',
        ])
      })

      expect(result.current.search.indexedColumns[networkId]?.node).toEqual([
        'col1',
        'col2',
      ])
    })

    it('should handle both node and edge columns', () => {
      const { result } = renderHook(() => useFilterStore())
      const networkId: IdType = 'network-1'

      act(() => {
        result.current.setIndexedColumns(networkId, GraphObjectType.NODE, [
          'col1',
        ])
        result.current.setIndexedColumns(networkId, GraphObjectType.EDGE, [
          'col2',
        ])
      })

      expect(result.current.search.indexedColumns[networkId]?.node).toEqual([
        'col1',
      ])
      expect(result.current.search.indexedColumns[networkId]?.edge).toEqual([
        'col2',
      ])
    })
  })

  describe('setIndex', () => {
    it('should set index for a network and type', () => {
      const { result } = renderHook(() => useFilterStore())
      const networkId: IdType = 'network-1'
      const index = { key1: ['value1'], key2: ['value2'] }

      act(() => {
        result.current.setIndex(networkId, GraphObjectType.NODE, index)
      })

      expect(result.current.getIndex(networkId, GraphObjectType.NODE)).toEqual(
        index,
      )
    })
  })

  describe('setConverter', () => {
    it('should set converter function', () => {
      const { result } = renderHook(() => useFilterStore())
      const converter = jest.fn((result: any) => result)

      act(() => {
        result.current.setConverter(converter)
      })

      expect(result.current.search.convertResults).toBe(converter)
    })
  })

  describe('setOptions', () => {
    it('should set search options', () => {
      const { result } = renderHook(() => useFilterStore())

      act(() => {
        result.current.setOptions({ exact: false, operator: 'AND' })
      })

      expect(result.current.search.options.exact).toBe(false)
      expect(result.current.search.options.operator).toBe('AND')
    })
  })

  describe('addFilterConfig', () => {
    it('should add a filter config', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }

      act(() => {
        result.current.addFilterConfig(filter)
      })

      expect(result.current.filterConfigs['filter-1']).toEqual(filter)
    })

    it('should not add duplicate filter config', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }

      act(() => {
        result.current.addFilterConfig(filter)
        result.current.addFilterConfig(filter)
      })

      // Should only have one
      expect(Object.keys(result.current.filterConfigs)).toHaveLength(1)
    })
  })

  describe('deleteFilterConfig', () => {
    it('should delete a filter config', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }

      act(() => {
        result.current.addFilterConfig(filter)
        result.current.deleteFilterConfig('filter-1')
      })

      expect(result.current.filterConfigs['filter-1']).toBeUndefined()
    })
  })

  describe('updateFilterConfig', () => {
    it('should update a filter config', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }
      const updatedFilter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col2',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 200 },
      }

      act(() => {
        result.current.addFilterConfig(filter)
        result.current.updateFilterConfig('filter-1', updatedFilter)
      })

      expect(result.current.filterConfigs['filter-1']).toEqual(updatedFilter)
    })
  })

  describe('updateRange', () => {
    it('should update range for a filter config', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'slider',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }
      const newRange: NumberRange = { min: 10, max: 90 }

      act(() => {
        result.current.addFilterConfig(filter)
        result.current.updateRange('filter-1', newRange)
      })

      expect(result.current.filterConfigs['filter-1'].range).toEqual(newRange)
    })

    it('should handle discrete range', () => {
      const { result } = renderHook(() => useFilterStore())
      const filter: FilterConfig = {
        name: 'filter-1',
        target: GraphObjectType.NODE,
        attributeName: 'col1',
        label: 'Filter 1',
        description: 'Test filter',
        widgetType: 'checkbox',
        displayMode: DisplayMode.SELECT,
        range: { min: 0, max: 100 },
      }
      const newRange: DiscreteRange<ValueType> = {
        values: ['value1', 'value2'],
      }

      act(() => {
        result.current.addFilterConfig(filter)
        result.current.updateRange('filter-1', newRange)
      })

      expect(result.current.filterConfigs['filter-1'].range).toEqual(newRange)
    })
  })
})
