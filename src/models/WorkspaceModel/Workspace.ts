import { NetworkSummary } from './NetworkSummary'
import { IdType } from '../IdType'
export interface Workspace {
  currentNetworkId: IdType
  networks: NetworkSummary[]
  name: string
  // options: any
}
