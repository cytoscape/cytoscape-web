import { IdType } from '../IdType'

export interface Workspace {
  name: string // Human readable name of the workspace
  id: IdType // UUID of the workspace. Who generates this?
  
  // UUID of the selected network in the workspace
  currentNetworkId: IdType
  
  // Network IDs visible to users (networks in the workspace)
  networkIds: IdType[]
  
  // Renderer name to associated network id
  renderers: Record<string, IdType>

  localModificationTime: Date
  creationTime: Date // Optional?
  networkModified: Record<IdType, boolean> // Network is editied locally or not
  options?: any // ???
}

// The main view will be named 'primary'
export const PRIMARY_RENDERER: string = 'primary'