import { castDraft } from 'immer'
import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { DiscreteFilterValue, FilterConfig } from '../../../models/FilterModel'
import { DisplayMode } from '../../../models/FilterModel/DisplayMode'
import {
  AppliedWorkspaceFilter,
  CompositeFilterNode,
  NamedFilter,
  WorkspaceFilter,
} from '../../../models/FilterModel/FilterTree'
import * as FilterStoreImpl from '../../../models/FilterModel/impl/filterStoreImpl'
import * as WorkspaceFiltersImpl from '../../../models/FilterModel/impl/workspaceFiltersImpl'
import {
  RenameFilterResult,
  WorkspaceFilters,
} from '../../../models/FilterModel/impl/workspaceFiltersImpl'
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
  deleteWorkspaceFilterFromDb,
  putFilterToDb,
  putWorkspaceFilterToDb,
} from '../../db'
import { toPlainObject } from '../../db/serialization'
import { isHydrating } from './hydrationContext'
import { cancelWrite, scheduleWrite } from './persistenceScheduler'

/**
 * The store for both search and filter.
 *
 */
interface FilterState<T> {
  search: Search<T>
  filterConfigs: Record<string, FilterConfig>
  // The FILTER tab's filters, by id. They belong to the workspace, not to a
  // network (docs/specifications/FILTER_SPECIFICATION.md).
  workspaceFilters: WorkspaceFilters
  // The workspace filter last applied to each network, by network id. Kept
  // in memory only, like the subnetworks it mostly concerns.
  appliedWorkspaceFilters: Record<IdType, AppliedWorkspaceFilter>
  // FILTER tab UI state of this browser tab, in memory only: the filter the
  // tab shows, and "Apply when filter changes" by network id
  selectedWorkspaceFilterId?: IdType
  workspaceFilterAutoApply: Record<IdType, boolean>
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

  // FILTER tab filters. Each change is written to the database after a short
  // delay, so a burst of edits (typing a criterion) makes one write.

  // A new, empty filter. A blank name becomes the default name, and a taken
  // one is numbered ("My filter 2").
  createWorkspaceFilter: (name: string) => WorkspaceFilter
  // Add filters read from a file, under new ids and free names
  addWorkspaceFilters: (filters: readonly NamedFilter[]) => WorkspaceFilter[]
  // Refused when the name is blank or taken (ignoring case)
  renameWorkspaceFilter: (id: IdType, name: string) => RenameFilterResult
  copyWorkspaceFilter: (id: IdType) => WorkspaceFilter | undefined
  deleteWorkspaceFilter: (id: IdType) => void
  setWorkspaceFilterRoot: (id: IdType, root: CompositeFilterNode) => void
  setWorkspaceFilterDisplayMode: (id: IdType, displayMode: DisplayMode) => void
  // Store a filter as is, e.g. one another tab changed
  putWorkspaceFilter: (filter: WorkspaceFilter) => void
  // Restore the filters saved in the database at startup (no write back)
  hydrateWorkspaceFilters: (filters: readonly WorkspaceFilter[]) => void

  // Bookkeeping for applyWorkspaceFilter (src/data/filter); it does not
  // change the network itself
  setAppliedWorkspaceFilter: (
    networkId: IdType,
    applied: AppliedWorkspaceFilter,
  ) => void
  deleteAppliedWorkspaceFilter: (networkId: IdType) => void
  // Network delete cascade: the network and its subnetworks
  deleteNetworkAppliedWorkspaceFilters: (networkId: IdType) => void
  deleteAllAppliedWorkspaceFilters: () => void

  setSelectedWorkspaceFilterId: (id: IdType | undefined) => void
  setWorkspaceFilterAutoApply: (networkId: IdType, autoApply: boolean) => void
}

type FilterStore = FilterState<any> & FilterAction

const workspaceFilterWriteKey = (id: IdType): string => `WorkspaceFilter:${id}`

/**
 * Write a workspace filter to the database after the coalescing delay. The
 * write reads the filter at flush time, so it stores the latest edit, and
 * does nothing when the filter was deleted meanwhile.
 */
const persistWorkspaceFilter = (id: IdType): void => {
  if (isHydrating()) return
  scheduleWrite(workspaceFilterWriteKey(id), useFilterStore.name, async () => {
    const filter = WorkspaceFiltersImpl.getWorkspaceFilter(
      useFilterStore.getState().workspaceFilters,
      id,
    )
    if (filter !== undefined) {
      await putWorkspaceFilterToDb(filter)
    }
  })
}

export const useFilterStore = create(
  immer<FilterStore>((set, get) => ({
    filterConfigs: {},
    workspaceFilters: {},
    appliedWorkspaceFilters: {},
    selectedWorkspaceFilterId: undefined,
    workspaceFilterAutoApply: {},
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

    createWorkspaceFilter: (name: string) => {
      const filter = WorkspaceFiltersImpl.newWorkspaceFilter(
        get().workspaceFilters,
        uuidv4(),
        name,
      )
      set((state) => {
        state.workspaceFilters[filter.id] = castDraft(filter)
      })
      persistWorkspaceFilter(filter.id)
      return filter
    },
    addWorkspaceFilters: (filters: readonly NamedFilter[]) => {
      const added = WorkspaceFiltersImpl.importWorkspaceFilters(
        get().workspaceFilters,
        filters,
        uuidv4,
      )
      set((state) => {
        added.forEach((filter) => {
          state.workspaceFilters[filter.id] = castDraft(filter)
        })
      })
      added.forEach((filter) => persistWorkspaceFilter(filter.id))
      return added
    },
    renameWorkspaceFilter: (id: IdType, name: string) => {
      const result = WorkspaceFiltersImpl.renameWorkspaceFilter(
        get().workspaceFilters,
        id,
        name,
      )
      if (result.success) {
        set((state) => {
          state.workspaceFilters[id] = castDraft(result.filter)
        })
        persistWorkspaceFilter(id)
      }
      return result
    },
    copyWorkspaceFilter: (id: IdType) => {
      const copy = WorkspaceFiltersImpl.copyWorkspaceFilter(
        get().workspaceFilters,
        id,
        uuidv4(),
      )
      if (copy !== undefined) {
        set((state) => {
          state.workspaceFilters[copy.id] = castDraft(copy)
        })
        persistWorkspaceFilter(copy.id)
      }
      return copy
    },
    deleteWorkspaceFilter: (id: IdType) => {
      if (
        WorkspaceFiltersImpl.getWorkspaceFilter(get().workspaceFilters, id) ===
        undefined
      ) {
        return
      }
      set((state) => {
        delete state.workspaceFilters[id]
      })
      // A pending write would put the filter back
      cancelWrite(workspaceFilterWriteKey(id))
      if (!isHydrating()) {
        void deleteWorkspaceFilterFromDb(id).catch((e) => {
          logStore.error(
            `[${useFilterStore.name}]: Failed to delete workspace filter ${id} from db`,
            e,
          )
        })
      }
    },
    setWorkspaceFilterRoot: (id: IdType, root: CompositeFilterNode) => {
      if (
        WorkspaceFiltersImpl.getWorkspaceFilter(get().workspaceFilters, id) ===
        undefined
      ) {
        return
      }
      set((state) => {
        state.workspaceFilters[id].root = castDraft(root)
      })
      persistWorkspaceFilter(id)
    },
    setWorkspaceFilterDisplayMode: (id: IdType, displayMode: DisplayMode) => {
      if (
        WorkspaceFiltersImpl.getWorkspaceFilter(get().workspaceFilters, id) ===
        undefined
      ) {
        return
      }
      set((state) => {
        state.workspaceFilters[id].displayMode = displayMode
      })
      persistWorkspaceFilter(id)
    },
    putWorkspaceFilter: (filter: WorkspaceFilter) => {
      set((state) => {
        state.workspaceFilters[filter.id] = castDraft(filter)
      })
      persistWorkspaceFilter(filter.id)
    },
    setAppliedWorkspaceFilter: (
      networkId: IdType,
      applied: AppliedWorkspaceFilter,
    ) => {
      set((state) => {
        state.appliedWorkspaceFilters[networkId] = applied
      })
    },
    deleteAppliedWorkspaceFilter: (networkId: IdType) => {
      set((state) => {
        delete state.appliedWorkspaceFilters[networkId]
      })
    },
    deleteNetworkAppliedWorkspaceFilters: (networkId: IdType) => {
      set((state) => {
        Object.keys(state.appliedWorkspaceFilters).forEach((id) => {
          if (FilterStoreImpl.isFilterOwnedBy(id, networkId)) {
            delete state.appliedWorkspaceFilters[id]
          }
        })
      })
    },
    deleteAllAppliedWorkspaceFilters: () => {
      set((state) => {
        state.appliedWorkspaceFilters = {}
      })
    },
    setSelectedWorkspaceFilterId: (id: IdType | undefined) => {
      set((state) => {
        state.selectedWorkspaceFilterId = id
      })
    },
    setWorkspaceFilterAutoApply: (networkId: IdType, autoApply: boolean) => {
      set((state) => {
        state.workspaceFilterAutoApply[networkId] = autoApply
      })
    },
    hydrateWorkspaceFilters: (filters: readonly WorkspaceFilter[]) => {
      // The filters come from the database, so they are not written back
      set((state) => {
        filters.forEach((filter) => {
          state.workspaceFilters[filter.id] = castDraft(filter)
        })
      })
    },
  })),
)
