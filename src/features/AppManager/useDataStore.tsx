import { useContext } from 'react'
import { DataStore } from './DataStore'
import { DataStoreContext } from './DataStoreContext'

const useDataStore = (): DataStore => {
  const context = useContext(DataStoreContext)
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider')
  }
  return context
}

export default useDataStore
