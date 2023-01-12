import { IdType } from '../IdType'

export interface Workspace {
  id: IdType // UUID of the workspace. Who generates this?
  currentNetworkId: IdType
  name: string
  networkIds: IdType[]
  // localModificationTime: Date
  // networkLocalModificationTimes: Record<IdType, Date>
  // modificationTime: Date
  creationTime: Date // Optional?
  modifiedFlags?: Record<IdType, boolean> // Network is editied locally or not
  options?: any // ???
}
