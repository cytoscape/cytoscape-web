import React, { ReactNode } from 'react'
import { useWorkspaceStore } from '../../hooks/stores/WorkspaceStore'
import { DataStoreContext } from './DataStoreContext'
import { useNetworkStore } from '../../hooks/stores/NetworkStore'

export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <DataStoreContext.Provider value={{ useWorkspaceStore, useNetworkStore }}>
      {children}
    </DataStoreContext.Provider>
  )
}
