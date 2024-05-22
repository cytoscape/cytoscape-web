import React, { createContext, useContext, ReactNode } from 'react'
import { WorkspaceStore, useWorkspaceStore } from 'src/store/WorkspaceStore'

interface DataStore {
  useWorkspaceStore: () => WorkspaceStore
}

const DataStoreContext = createContext<DataStore | undefined>(undefined)

export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <DataStoreContext.Provider value={{ useWorkspaceStore }}>
      {children}
    </DataStoreContext.Provider>
  )
}

export const useDataStore = (): DataStore => {
  const context = useContext(DataStoreContext)
  if (!context) {
    throw new Error('useDataStore must be used within a DataStoreProvider')
  }
  return context
}
