import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Search, SearchOptions } from '../models/FilterModel/Search'
import { IdType } from '../models/IdType'
import { GraphObjectType } from '../models/NetworkModel'
import { ValueType } from '../models/TableModel'
import { NumberRange } from '../models/PropertyModel/NumberRange'
import { DiscreteRange } from '../models/PropertyModel/DiscreteRange'
import { deleteFilterFromDb, putFilterToDb } from './persist/db'
import { FilterConfig } from '../models/FilterModel'

/**
 * The store for both search and filter.
 *
 */
interface FilterState<T> {
  search: Search<T>
  filterConfigs: Record<string, FilterConfig>
}

interface FilterAction {
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
    setConverter: (converter: (result: any) => IdType[]) => {
      set((state) => {
        state.search.convertResults = converter
      })
    },
    setQuery: (query: string) => {
      set((state) => {
        state.search.query = query
      })
    },
    getIndex: <T>(networkId: IdType) => {
      return (set as any).getState().search.index[networkId] as T
    },
    setIndex: <T>(networkId: string, type: GraphObjectType, index: T) => {
      set((state) => {
        const indexObject = get().search.index[networkId]
        if (indexObject === undefined) {
          if (type === GraphObjectType.NODE) {
            state.search.index[networkId] = {
              node: index,
              edge: undefined,
            }
          } else if (type === GraphObjectType.EDGE) {
            state.search.index[networkId] = {
              node: undefined,
              edge: index,
            }
          }
        } else {
          if (type === GraphObjectType.NODE) {
            state.search.index[networkId].node = index
          } else if (type === GraphObjectType.EDGE) {
            state.search.index[networkId].edge = index
          }
        }
      })
    },
    setOptions: (options: SearchOptions) => {
      set((state) => {
        state.search.options = options
      })
    },
    setIndexedColumns(networkId, type, columns) {
      set((state) => {
        const indexedColumns = get().search.indexedColumns[networkId]
        if (indexedColumns === undefined) {
          if (type === GraphObjectType.NODE) {
            state.search.indexedColumns[networkId] = {
              node: columns,
              edge: [],
            }
          } else if (type === GraphObjectType.EDGE) {
            state.search.indexedColumns[networkId] = {
              node: [],
              edge: columns,
            }
          }
        } else {
          if (type === GraphObjectType.NODE) {
            state.search.indexedColumns[networkId].node = columns
          } else if (type === GraphObjectType.EDGE) {
            state.search.indexedColumns[networkId].edge = columns
          }
        }
      })
    },
    addFilterConfig: (filter: FilterConfig) => {
      set((state) => {
        const newName = filter.name
        const existingConfig = state.filterConfigs[newName]
        if (existingConfig !== undefined) {
          console.warn(`Filter config with name ${newName} already exists`)
          return
        }
        state.filterConfigs[newName] = filter
        putFilterToDb(filter)
          .then(() => {
            console.log('New filter saved to db: ', filter.name)
          })
          .catch((e) => {
            console.error(
              `Failed to store the new filter to db: ${filter.name}`,
              e,
            )
          })
      })
    },
    deleteFilterConfig: (name: string) => {
      set((state) => {
        delete state.filterConfigs[name]
        deleteFilterFromDb(name)
      })
    },
    updateFilterConfig: (name: string, filter: FilterConfig) => {
      set((state) => {
        state.filterConfigs[name] = filter
        putFilterToDb(filter)
      })
    },
    updateRange: (
      name: string,
      range: NumberRange | DiscreteRange<ValueType>,
    ) => {
      set((state) => {
        state.filterConfigs[name].range = range
        putFilterToDb(state.filterConfigs[name])
          .then(() => {
            console.log('Range updated in db: ', name)
          })
          .catch((e) => {
            console.error(`Failed to update range in db: ${name}`, e)
          })
      })
    },
  })),
)
