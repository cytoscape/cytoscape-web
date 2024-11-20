import { IdType } from '../IdType'
import { OpaqueAspects } from '../OpaqueAspectModel'

export interface OpaqueAspectState {
  opaqueAspects: Record<IdType, OpaqueAspects>
}

export interface OpaqueAspectActions {
  add: (networkId: IdType, aspectName: string, aspectData: any[]) => void

  // Add multiple aspects to the store at once
  addAll: (networkId: IdType, aspectList: Record<string, any[]>[]) => void

  // Delete the entry from the store
  delete: (networkId: IdType) => void

  deleteSingleAspect: (networkId: IdType, aspectName: string) => void

  // Delete all aspects for all networks
  deleteAll: () => void

  // Clear all aspects for the given network
  clearAspects: (networkId: IdType) => void

  update: (networkId: IdType, aspectName: string, aspectData: any[]) => void
}

export type OpaqueAspectStoreModel = OpaqueAspectState & OpaqueAspectActions
