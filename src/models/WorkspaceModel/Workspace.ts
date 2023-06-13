import { IdType } from '../IdType'

export interface Workspace {
  id: IdType // UUID of the workspace. Who generates this?
  currentNetworkId: IdType // UUID of the selected network in the workspace
  
  // Renderer name to associated network id
  renderers: Record<string, IdType>
  
  name: string // Human readable name of the workspace
  networkIds: IdType[]
  localModificationTime: Date
  // networkLocalModificationTimes: Record<IdType, Date>
  // modificationTime: Date
  creationTime: Date // Optional?
  networkModified: Record<IdType, boolean> // Network is editied locally or not
  options?: any // ???
}
