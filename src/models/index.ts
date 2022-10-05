import { NetworkView } from './NetworkView'
import { Table, Row } from './Table'
import { NetworkModel } from './Network'
import { VisualStyle } from './Style'

export interface NetworkSummary {
  uuid: string
  name: string
  iconUrl: URL
  attributes: Row
  _dbKey: number // internal storage key for db (TODO: how to store keys if there are multiple data sources? e.g. local indexedDB vs a REST endpoint?)
  createdAt: Date
  modifiedAt: Date
}

export interface WorkingNetwork {
  network: NetworkModel
  nodeTable: Table
  edgeTable: Table
  networkView: NetworkView
  visualStyle: VisualStyle
  summary: NetworkSummary
}

export interface Workspace {
  name?: string
  uuid?: string
  networkSummaries: NetworkSummary[]
  currentNetworkId: WorkingNetwork
}
