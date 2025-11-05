import { act, renderHook } from '@testing-library/react'

import { FilterConfig } from '../../models/FilterModel'
import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import { FilterWidgetType } from '../../models/FilterModel/FilterWidgetType'
import { GraphObjectType } from '../../models/NetworkModel'
import { useFilterStore } from './FilterStore'

describe('useFilterStore', () => {
  it('should add a filter config to the store', () => {
    const filterConfig: FilterConfig = {
      name: 'test-filter',
      attributeName: 'test-attr',
      target: GraphObjectType.NODE,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Test filter',
      label: 'Test Filter',
      range: { values: ['value1', 'value2'] },
      displayMode: DisplayMode.SHOW_HIDE,
    }

    const { result } = renderHook(() => useFilterStore())

    act(() => {
      result.current.addFilterConfig(filterConfig)
    })

    expect(result.current.filterConfigs['test-filter']).toEqual(filterConfig)
  })

  it('should delete a filter config from the store', () => {
    const filterConfig: FilterConfig = {
      name: 'test-filter',
      attributeName: 'test-attr',
      target: GraphObjectType.NODE,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Test filter',
      label: 'Test Filter',
      range: { values: ['value1'] },
      displayMode: DisplayMode.SHOW_HIDE,
    }

    const { result } = renderHook(() => useFilterStore())

    act(() => {
      result.current.addFilterConfig(filterConfig)
    })

    expect(result.current.filterConfigs['test-filter']).toBeDefined()

    act(() => {
      result.current.deleteFilterConfig('test-filter')
    })

    expect(result.current.filterConfigs['test-filter']).toBeUndefined()
  })

  it('should update a filter config in the store', () => {
    const filterConfig: FilterConfig = {
      name: 'test-filter',
      attributeName: 'test-attr',
      target: GraphObjectType.NODE,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Test filter',
      label: 'Test Filter',
      range: { values: ['value1'] },
      displayMode: DisplayMode.SHOW_HIDE,
    }

    const updatedFilterConfig: FilterConfig = {
      ...filterConfig,
      description: 'Updated test filter',
    }

    const { result } = renderHook(() => useFilterStore())

    act(() => {
      result.current.addFilterConfig(filterConfig)
    })

    act(() => {
      result.current.updateFilterConfig('test-filter', updatedFilterConfig)
    })

    expect(result.current.filterConfigs['test-filter']).toEqual(
      updatedFilterConfig,
    )
  })
})
