import { OpaqueAspects } from '../OpaqueAspectModel'

export interface OpaqueAspectState {
  opaqueAspects: OpaqueAspects
}

export interface OpaqueAspectActions {
  add: (aspectName: string, aspectData: any[]) => void
  delete: (aspectName: string) => void
  deleteAll: () => void

  update: (aspectName: string, aspectData: any[]) => void
}

export type OpaqueAspectStoreModel = OpaqueAspectState & OpaqueAspectActions
