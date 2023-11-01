import { IdType } from '../IdType'

export interface Workspace {
  name: string // Human readable name of the workspace
  id: IdType // UUID of the workspace. Who generates this?

  // UUID of the selected network in the workspace
  currentNetworkId: IdType

  // Network IDs visible to users (networks in the workspace)
  networkIds: IdType[]

  localModificationTime: Date
  creationTime: Date // Optional?
  networkModified: Record<IdType, boolean | undefined> // Network is edited locally or not
  options?: any // ???
}
