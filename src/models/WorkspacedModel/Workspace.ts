import { NetworkSummary } from './NetworkSummary'

export interface Workspace {
  name: string
  currentNetworkId: string
  networkSummaries: NetworkSummary[]
  oprions: any // ???

  // Add more fields here...
}
