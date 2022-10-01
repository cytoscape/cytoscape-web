import { NetworkView } from './NetworkView'
import { Table, Row } from './Table'

export interface NetworkSummary {
  uuid: string
  name: string
  url: URL
  attributes: Row
  _key: string // internal storage key for db (TODO: how to store keys if there are multiple data sources? e.g. local indexedDB vs a REST endpoint?)
}

export interface WorkingNetwork {
  network: null
  networkAttributes: Table
  nodeTable: Table
  edgeTable: Table
  networkView: NetworkView
  visualStyle: null
}

export interface Workspace {
  name?: string
  uuid?: string
  networkSummaries: NetworkSummary[]
  currentNetwork: WorkingNetwork
}
