import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { DiscreteFilterValue, FilterConfig } from '../../../models/FilterModel'
import * as FilterStoreImpl from '../../../models/FilterModel/impl/filterStoreImpl'
import { Search, SearchOptions } from '../../../models/FilterModel/Search'
import { SearchState } from '../../../models/FilterModel/SearchState'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { DiscreteRange } from '../../../models/PropertyModel/DiscreteRange'
import { NumberRange } from '../../../models/PropertyModel/NumberRange'
import {
  clearFiltersFromDb,
  deleteFilterFromDb,
  deleteFiltersFromDb,
  deleteNetworkFiltersFromDb,
  putFilterToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'

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
  deleteNetworkIndex: (networkId: string) => void
  deleteAllNetworkIndexes: () => void
  setConverter: (converter: (result: any) => IdType[]) => void
  setOptions: (options: SearchOptions) => void

  // Manage filter configurations
  addFilterConfig: (filterConfig: FilterConfig) => void
  deleteFilterConfig: (name: string) => void
  updateFilterConfig: (name: string, filter: FilterConfig) => void

  updateRange: (
    name: string,
    range: NumberRange | DiscreteRange<DiscreteFilterValue>,
  ) => void
  setFilterEnabled: (name: string, enabled: boolean) => void

  // Restore the configs saved in the database at startup (#774). Keeps those
  // owned by a network in the workspace and deletes the other rows.
  hydrate: (configs: FilterConfig[], networkIds: IdType[]) => void
  // Delete the configs of a network and its subnetworks (delete cascade)
  deleteNetworkFilterConfigs: (networkId: IdType) => void
  deleteAllFilterConfigs: () => void
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
        const newState = FilterStoreImpl.setIndex(state, networkId, type, index)
        state.search = newState.search
        return state
      })
    },
    deleteNetworkIndex: (networkId: string) => {
      set((state) => {
        const newState = FilterStoreImpl.deleteNetworkIndex(state, networkId)
        state.search = newState.search
        return state
      })
    },
    deleteAllNetworkIndexes: () => {
      set((state) => {
        const newState = FilterStoreImpl.deleteAllNetworkIndexes(state)
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
        // Convert to plain object before saving (filter may be an Immer proxy)
        const plainFilter = toPlainObject(filter)
        if (!isHydrating()) {
          void putFilterToDb(plainFilter)
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
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    deleteFilterConfig: (name: string) => {
      set((state) => {
        const newState = FilterStoreImpl.deleteFilterConfig(state, name)
        // Guarded like every other write here: during hydration this store is
        // being filled FROM the database, and deleting the row back out would
        // mint a change record every peer tab then hydrates in turn.
        if (!isHydrating()) {
          void deleteFilterFromDb(name).catch((e) => {
            logStore.error(
              `[${useFilterStore.name}]: Failed to delete the filter from db: ${name}`,
              e,
            )
          })
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    updateFilterConfig: (name: string, filter: FilterConfig) => {
      set((state) => {
        const newState = FilterStoreImpl.updateFilterConfig(state, name, filter)
        // Convert to plain object before saving (filter may be an Immer proxy)
        const plainFilter = toPlainObject(filter)
        if (!isHydrating()) {
          void putFilterToDb(plainFilter).catch((e) => {
            logStore.error(
              `[${useFilterStore.name}]: Failed to update the filter in db: ${name}`,
              e,
            )
          })
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    updateRange: (
      name: string,
      range: NumberRange | DiscreteRange<DiscreteFilterValue>,
    ) => {
      set((state) => {
        const newState = FilterStoreImpl.updateRange(state, name, range)
        const newFilter = newState.filterConfigs[name]
        if (newFilter) {
          // Convert Immer proxy to plain object before saving
          const plainFilter = toPlainObject(newFilter)
          if (!isHydrating()) {
            putFilterToDb(plainFilter)
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
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    setFilterEnabled: (name: string, enabled: boolean) => {
      set((state) => {
        const newState = FilterStoreImpl.setFilterEnabled(state, name, enabled)
        const newFilter = newState.filterConfigs[name]
        if (newFilter && !isHydrating()) {
          // Convert Immer proxy to plain object before saving
          putFilterToDb(toPlainObject(newFilter)).catch((e) => {
            logStore.error(
              `[${useFilterStore.name}]: Failed to update enabled state in db: ${name}`,
              e,
            )
          })
        }
        state.filterConfigs = newState.filterConfigs
        return state
      })
    },
    hydrate: (configs: FilterConfig[], networkIds: IdType[]) => {
      const { owned, orphaned } = FilterStoreImpl.partitionFilterConfigsByOwner(
        configs,
        networkIds,
      )
      // The configs come from the database, so they are not written back
      set((state) => {
        owned.forEach((config) => {
          state.filterConfigs[config.name] = config
        })
        return state
      })
      if (orphaned.length > 0) {
        const names = orphaned.map((config) => config.name)
        logStore.info(
          `[${useFilterStore.name}]: Deleting filters without a network: ${names.join(', ')}`,
        )
        void deleteFiltersFromDb(names).catch((e) => {
          logStore.error(
            `[${useFilterStore.name}]: Failed to delete orphaned filters from db`,
            e,
          )
        })
      }
    },
    deleteNetworkFilterConfigs: (networkId: IdType) => {
      set((state) => {
        const newState = FilterStoreImpl.deleteNetworkFilterConfigs(
          state,
          networkId,
        )
        state.filterConfigs = newState.filterConfigs
        return state
      })
      // Deletes by prefix in the db too, so rows missing from the store go
      if (!isHydrating()) {
        void deleteNetworkFiltersFromDb(networkId).catch((e) => {
          logStore.error(
            `[${useFilterStore.name}]: Failed to delete the filters of network ${networkId} from db`,
            e,
          )
        })
      }
    },
    deleteAllFilterConfigs: () => {
      set((state) => {
        state.filterConfigs = {}
        return state
      })
      if (!isHydrating()) {
        void clearFiltersFromDb().catch((e) => {
          logStore.error(
            `[${useFilterStore.name}]: Failed to clear filters from db`,
            e,
          )
        })
      }
    },
  })),
)
