import { NetworkSummary } from './NetworkSummary'
import { IdType } from '../IdType'

export interface Workspace {
  id: IdType // UUID of the workspace. Who generates this?
  selectedNetworkId?: IdType
  networkSummaries: Record<IdType, NetworkSummary> // Or maybe just an array of IDs?
  name: string
  // localModificationTime: Date
  // networkLocalModificationTimes: Record<IdType, Date>
  // modificationTime: Date
  creationTime: Date // Optional?
  options?: any // ???
}
