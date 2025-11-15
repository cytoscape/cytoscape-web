import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { deleteFilterFromDb, putFilterToDb } from '../../db'
import { logStore } from '../../debug'
import { FilterConfig } from '../../models/FilterModel'
import * as FilterStoreImpl from '../../models/FilterModel/impl/filterStoreImpl'
import { Search, SearchOptions } from '../../models/FilterModel/Search'
import { SearchState } from '../../models/FilterModel/SearchState'
import { IdType } from '../../models/IdType'
import { GraphObjectType } from '../../models/NetworkModel'
import { DiscreteRange } from '../../models/PropertyModel/DiscreteRange'
import { NumberRange } from '../../models/PropertyModel/NumberRange'
import { ValueType } from '../../models/TableModel'
/**
 * The store for both search and filter.
 *
 */
interface FilterState<T> {
  search: Search<T>
  filterConfigs: Record<string, FilterConfig>
}

interface FilterAction {
  setSearchState: (searchState: SearchState) => void
  setQuery: (query: string) => void
  setIndexedColumns: (
    networkId: IdType,
    type: GraphObjectType,
    columns: string[],
  ) => void
  getIndex: <T>(networkId: IdType, type: GraphObjectType) => T
  setIndex: <T>(networkId: string, type: GraphObjectType, index: T) => void
  setConverter: (converter: (result: any) => IdType[]) => void
  setOptions: (options: SearchOptions) => void

  // Manage filter configurations
  addFilterConfig: (filterConfig: FilterConfig) => void
  deleteFilterConfig: (name: string) => void
  updateFilterConfig: (name: string, filter: FilterConfig) => void

  updateRange: (
    name: string,
    range: NumberRange | DiscreteRange<ValueType>,
  ) => void
}

type FilterStore = FilterState<any> & FilterAction

export const useFilterStore = create(
  immer<FilterStore>((set, get) => ({
    filterConfigs: {},
    search: {
      state: SearchState.READY,
      query: '',
      indexedColumns: {},
      options: {
        exact: true,
        operator: 'OR',
      },
      // Dummy function
      convertResults: (result: any[]) => {
        return result
      },
      index: {},
    },
    setSearchState: (searchState: SearchState) => {
      set((state) => {
        const newState = FilterStoreImpl.setSearchState(state, searchState)
        state.search = newState.search
        return state
      })
    },
    setConverter: (converter: (result: any) => IdType[]) => {
      set((state) => {
        const newState = FilterStoreImpl.setConverter(state, converter)
        state.search = newState.search
        return state
      })
    },
    setQuery: (query: string) => {
      set((state) => {
        const newState = FilterStoreImpl.setQuery(state, query)
        state.search = newState.search
        return state
      })
    },
    getIndex: <T>(networkId: IdType, type: GraphObjectType) => {
      return FilterStoreImpl.getIndex(get(), networkId, type) as T
    },
    setIndex: <T>(networkId: string, type: GraphObjectType, index: T) => {
      set((state) => {
        const newState = FilterStoreImpl.setIndex(
          state,
          networkId,
          type,
          index,
        )
        state.search = newState.search
        return state
      })
    },
    setOptions: (options: SearchOptions) => {
      set((state) => {
        const newState = FilterStoreImpl.setOptions(state, options)
        state.search = newState.search
        return state
      })
    },
    setIndexedColumns(networkId, type, columns) {
      set((state) => {
        const newState = FilterStoreImpl.setIndexedColumns(
          state,
          networkId,
          type,
          columns,
        )
        state.search = newState.search
        return state
      })
    },
    addFilterConfig: (filter: FilterConfig) => {
      set((state) => {
        const existingConfig = state.filterConfigs[filter.name]
        if (existingConfig !== undefined) {
          logStore.warn(
            `[${useFilterStore.name}]: Filter config with name ${filter.name} already exists`,
          )
          return state
        }
        const newState = FilterStoreImpl.addFilterConfig(state, filter)
        putFilterToDb(filter)
          .then(() => {
            logStore.info(
              `[${useFilterStore.name}]: New filter saved to db: ${filter.name}`,
            )
          })
          .catch((e) => {
            logStore.error(
              `[${useFilterStore.name}]: Failed to store the new filter to db: ${filter.name}`,
              e,
            )
          })
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    deleteFilterConfig: (name: string) => {
      set((state) => {
        const newState = FilterStoreImpl.deleteFilterConfig(state, name)
        deleteFilterFromDb(name)
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    updateFilterConfig: (name: string, filter: FilterConfig) => {
      set((state) => {
        const newState = FilterStoreImpl.updateFilterConfig(state, name, filter)
        putFilterToDb(filter)
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    updateRange: (
      name: string,
      range: NumberRange | DiscreteRange<ValueType>,
    ) => {
      set((state) => {
        const newState = FilterStoreImpl.updateRange(state, name, range)
        const newFilter = newState.filterConfigs[name]
        if (newFilter) {
          putFilterToDb(newFilter)
            .then(() => {
              logStore.info(
                `[${useFilterStore.name}]: Range updated in db: ${name}`,
              )
            })
            .catch((e) => {
              logStore.error(
                `[${useFilterStore.name}]: Failed to update range in db: ${name}`,
                e,
              )
            })
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
  })),
)
