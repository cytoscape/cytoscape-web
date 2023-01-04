import { NetworkSummary } from './NetworkSummary'
import { IdType } from '../IdType'

export interface Workspace {
  id: IdType
  selectedNetworkId: IdType
  networks: NetworkSummary[]
  name: string
  modificationTime: Date
  creationTime: Date
  options: any
}
