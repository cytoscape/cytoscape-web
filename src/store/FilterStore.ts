import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Search, SearchOptions } from '../models/FilterModel/Search'
import { IdType } from '../models/IdType'
import { GraphObjectType } from '../models/NetworkModel'

interface FilterState<T> {
  search: Search<T>
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
}

type FilterStore = FilterState<any> & FilterAction

export const useFilterStore = create(
  immer<FilterStore>((set) => ({
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
        if (type === GraphObjectType.NODE) {
          state.search.index[networkId].node = index
        }
        if (type === GraphObjectType.EDGE) {
          state.search.index[networkId].edge = index
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
        if (type === GraphObjectType.NODE) {
          state.search.indexedColumns[networkId].node = columns
        } else if (type === GraphObjectType.EDGE) {
          state.search.indexedColumns[networkId].edge = columns
        }
      })
    },
  })),
)
