import { NetworkView } from './NetworkView'
import { Table } from './Table'
import { Row } from './Table/Row'

export interface Workspace {
  name?: string
  uuid?: string
  networkSummaries: NetworkSummary[]
  currentNetwork: WorkingNetwork
}

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
