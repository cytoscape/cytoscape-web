import { IdType } from '../IdType'
import { NdexNetworkProperty } from './NdexNetworkProperty'
import { Visibility } from './Visibility'

export interface NdexNetworkSummary {
  isNdex: boolean
  ownerUUID: IdType
  isReadOnly: boolean
  subnetworkIds: number[]
  isValid: boolean
  warnings: string[]
  errorMessage?: string
  isShowcase: boolean
  isCertified: boolean
  indexLevel: string
  hasLayout: boolean
  hasSample: boolean
  cxFileSize: number
  cx2FileSize: number
  name: string
  properties: NdexNetworkProperty[]
  owner: string
  version: string
  completed: boolean
  visibility: Visibility
  nodeCount: number
  edgeCount: number
  description: string
  creationTime: Date
  externalId: string
  isDeleted: boolean
  modificationTime: Date
}
