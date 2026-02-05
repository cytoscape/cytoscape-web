import { IdType } from '../../IdType'
import { GraphObjectType } from '../../NetworkModel'
import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { ValueType } from '../../TableModel'
import { FilterConfig } from '../FilterConfig'
import { IndexedColumns, Indices, Search, SearchOptions } from '../Search'
import { SearchState } from '../SearchState'

export interface FilterState<T> {
  search: Search<T>
  filterConfigs: Record<string, FilterConfig>
}

/**
 * Set search state
 */
export const setSearchState = <T>(
  state: FilterState<T>,
  searchState: SearchState,
): FilterState<T> => {
  return {
    ...state,
    search: {
      ...state.search,
      state: searchState,
    },
  }
}

/**
 * Set query
 */
export const setQuery = <T>(
  state: FilterState<T>,
  query: string,
): FilterState<T> => {
  return {
    ...state,
    search: {
      ...state.search,
      query,
    },
  }
}

/**
 * Set indexed columns
 */
export const setIndexedColumns = <T>(
  state: FilterState<T>,
  networkId: IdType,
  type: GraphObjectType,
  columns: string[],
): FilterState<T> => {
  const indexedColumns = { ...state.search.indexedColumns }
  const networkIndexedColumns = indexedColumns[networkId] ?? {
    [GraphObjectType.NODE]: [],
    [GraphObjectType.EDGE]: [],
  }

  const newNetworkIndexedColumns: IndexedColumns = {
    ...networkIndexedColumns,
    [type]: columns,
  }

  return {
    ...state,
    search: {
      ...state.search,
      indexedColumns: {
        ...indexedColumns,
        [networkId]: newNetworkIndexedColumns,
      },
    },
  }
}

/**
 * Set index
 */
export const setIndex = <T, I>(
  state: FilterState<T>,
  networkId: IdType,
  type: GraphObjectType,
  index: I,
): FilterState<T> => {
  const searchIndex = { ...state.search.index }
  const indexObject = searchIndex[networkId] ?? {
    [GraphObjectType.NODE]: undefined,
    [GraphObjectType.EDGE]: undefined,
  }

  const newIndexObject: Indices<any> = {
    ...indexObject,
    [type]: index,
  }

  return {
    ...state,
    search: {
      ...state.search,
      index: {
        ...searchIndex,
        [networkId]: newIndexObject,
      },
    },
  }
}

/**
 * Get index
 */
export const getIndex = <T, I>(
  state: FilterState<T>,
  networkId: IdType,
  type: GraphObjectType,
): I | undefined => {
  const indexObject = state.search.index[networkId]
  if (indexObject === undefined) {
    return undefined
  }
  return (type === GraphObjectType.NODE
    ? indexObject.node
    : indexObject.edge) as I | undefined
}

/**
 * Set converter
 */
export const setConverter = <T>(
  state: FilterState<T>,
  converter: (result: any) => IdType[],
): FilterState<T> => {
  return {
    ...state,
    search: {
      ...state.search,
      convertResults: converter,
    },
  }
}

/**
 * Set options
 */
export const setOptions = <T>(
  state: FilterState<T>,
  options: SearchOptions,
): FilterState<T> => {
  return {
    ...state,
    search: {
      ...state.search,
      options,
    },
  }
}

/**
 * Add filter config
 */
export const addFilterConfig = <T>(
  state: FilterState<T>,
  filter: FilterConfig,
): FilterState<T> => {
  const existingConfig = state.filterConfigs[filter.name]
  if (existingConfig !== undefined) {
    return state // Don't add duplicate
  }

  return {
    ...state,
    filterConfigs: {
      ...state.filterConfigs,
      [filter.name]: filter,
    },
  }
}

/**
 * Delete filter config
 */
export const deleteFilterConfig = <T>(
  state: FilterState<T>,
  name: string,
): FilterState<T> => {
  const { [name]: deleted, ...restFilterConfigs } = state.filterConfigs
  return {
    ...state,
    filterConfigs: restFilterConfigs,
  }
}

/**
 * Update filter config
 */
export const updateFilterConfig = <T>(
  state: FilterState<T>,
  name: string,
  filter: FilterConfig,
): FilterState<T> => {
  return {
    ...state,
    filterConfigs: {
      ...state.filterConfigs,
      [name]: filter,
    },
  }
}

/**
 * Update range
 */
export const updateRange = <T>(
  state: FilterState<T>,
  name: string,
  range: NumberRange | DiscreteRange<ValueType>,
): FilterState<T> => {
  const filter = state.filterConfigs[name]
  if (filter === undefined) {
    return state
  }

  return {
    ...state,
    filterConfigs: {
      ...state.filterConfigs,
      [name]: {
        ...filter,
        range,
      },
    },
  }
}

