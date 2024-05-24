import React, { ReactNode } from 'react'
import { useWorkspaceStore } from 'src/store/WorkspaceStore'
import { DataStoreContext } from './DataStoreContext'
import { useNetworkStore } from 'src/store/NetworkStore'

export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <DataStoreContext.Provider value={{ useWorkspaceStore, useNetworkStore }}>
      {children}
    </DataStoreContext.Provider>
  )
}
