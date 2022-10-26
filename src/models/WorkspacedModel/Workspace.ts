import { NetworkSummary } from './NetworkSummary'

export interface Workspace {
  currentNetworkId: string
  networks: NetworkSummary[]
  oprions: any // ???

  // Add more fields here...
}
