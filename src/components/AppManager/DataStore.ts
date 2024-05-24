import { WorkspaceStore } from 'src/store/WorkspaceStore'
import { NetworkStore } from 'src/store/NetworkStore'

export interface DataStore {
  useWorkspaceStore: () => WorkspaceStore
  useNetworkStore: () => NetworkStore
}
