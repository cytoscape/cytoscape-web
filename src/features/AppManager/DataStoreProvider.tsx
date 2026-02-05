import React, { ReactNode } from 'react'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { DataStoreContext } from './DataStoreContext'

export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <DataStoreContext.Provider value={{ useWorkspaceStore, useNetworkStore }}>
      {children}
    </DataStoreContext.Provider>
  )
}
