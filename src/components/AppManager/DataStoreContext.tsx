import { createContext } from 'react'
import { DataStore } from './DataStore'

export const DataStoreContext = createContext<DataStore>({} as DataStore)
