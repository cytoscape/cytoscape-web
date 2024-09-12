import { NetworkStore } from '../../models/StoreModel/NetworkStoreModel'
import { WorkspaceStore } from '../../models/StoreModel/WorkspaceStoreModel'

export interface DataStore {
  useWorkspaceStore: () => WorkspaceStore
  useNetworkStore: () => NetworkStore
}
