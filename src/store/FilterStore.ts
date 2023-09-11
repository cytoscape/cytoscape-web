import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Search } from '../models/FilterModel/Search'
import { IdType } from '../models/IdType'

interface FilterState<T> {
  search: Search<T>
}

interface FilterAction {
  setQuery: (query: string) => void
  getIndex: <T>(networkId: IdType) => T
  setIndex: <T>(networkId: string, index: T) => void
}

type FilterStore = FilterState<any> & FilterAction

export const useFilterStore = create(
  immer<FilterStore>((set) => ({
    search: {
      query: '',
      exactMatch: true,
      // Dummy function
      toSelection: (result: any[]) => {
        return result
      },
      index: {},
    },
    setQuery: (query: string) => {
      set((state) => {
        state.search.query = query
      })
    },
    getIndex: <T>(networkId: IdType) => {
      return (set as any).getState().search.index[networkId] as T
    },
    setIndex: <T>(networkId: string, index: T) => {
      set((state) => {
        state.search.index[networkId] = index
      })
    },
  })),
)
