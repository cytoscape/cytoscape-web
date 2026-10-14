import { IdType } from '../../IdType'
import { GraphObjectType } from '../../NetworkModel'
import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { DiscreteFilterValue } from '../DiscreteFilterValue'
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
  return (
    type === GraphObjectType.NODE ? indexObject.node : indexObject.edge
  ) as I | undefined
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
  const restFilterConfigs = { ...state.filterConfigs }
  delete restFilterConfigs[name]
  return {
    ...state,
    filterConfigs: restFilterConfigs,
  }
}

/**
 * Whether a filter config belongs to a network. Configs are keyed by the id
 * of the network they filter: a Hierarchy Viewer subnetwork's id is
 * `<networkId>_<subsystemNodeId>`, so a network owns its own config and those
 * of its subnetworks (#774).
 */
export const isFilterOwnedBy = (name: string, networkId: IdType): boolean =>
  name === networkId || name.startsWith(`${networkId}_`)

/**
 * Delete the filter configs of a network and its subnetworks
 */
export const deleteNetworkFilterConfigs = <T>(
  state: FilterState<T>,
  networkId: IdType,
): FilterState<T> => {
  const names = Object.keys(state.filterConfigs).filter((name) =>
    isFilterOwnedBy(name, networkId),
  )
  if (names.length === 0) {
    return state
  }

  const restFilterConfigs = { ...state.filterConfigs }
  names.forEach((name) => {
    delete restFilterConfigs[name]
  })
  return {
    ...state,
    filterConfigs: restFilterConfigs,
  }
}

/**
 * Split stored filter configs into those owned by a network in the workspace
 * and orphans (their network was deleted, or no network owns them).
 */
export const partitionFilterConfigsByOwner = (
  configs: FilterConfig[],
  networkIds: IdType[],
): { owned: FilterConfig[]; orphaned: FilterConfig[] } => {
  const owned: FilterConfig[] = []
  const orphaned: FilterConfig[] = []
  configs.forEach((config) => {
    const hasOwner = networkIds.some((networkId) =>
      isFilterOwnedBy(config.name, networkId),
    )
    ;(hasOwner ? owned : orphaned).push(config)
  })
  return { owned, orphaned }
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
  range: NumberRange | DiscreteRange<DiscreteFilterValue>,
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

/**
 * Switch a filter on or off
 */
export const setFilterEnabled = <T>(
  state: FilterState<T>,
  name: string,
  enabled: boolean,
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
        enabled,
      },
    },
  }
}

/**
 * Remove all per-network search state (index + indexed columns) for a
 * deleted network. Without this, indexes leaked in memory for the rest of
 * the session (REVIEW.md round-2 P2, cleaned via the delete orchestrator).
 */
export const deleteNetworkIndex = <T>(
  state: FilterState<T>,
  networkId: IdType,
): FilterState<T> => {
  const index = { ...state.search.index }
  const indexedColumns = { ...state.search.indexedColumns }
  delete index[networkId]
  delete indexedColumns[networkId]
  return {
    ...state,
    search: {
      ...state.search,
      index,
      indexedColumns,
    },
  }
}

/**
 * Remove all per-network search state for every network.
 */
export const deleteAllNetworkIndexes = <T>(
  state: FilterState<T>,
): FilterState<T> => {
  return {
    ...state,
    search: {
      ...state.search,
      index: {},
      indexedColumns: {},
    },
  }
}
