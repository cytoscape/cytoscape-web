import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface TableLoaderState {
  loading: boolean
}

interface TableLoaderAction {}

type TableLoaderStore = TableLoaderState & TableLoaderAction

/**
 * Store that holds LLM Query related state/actions
 */
export const useLLMQueryStore = create(
  immer<TableLoaderStore>((set) => ({
    loading: false,
  })),
)
