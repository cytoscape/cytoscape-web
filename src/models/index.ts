import { NetworkView } from './NetworkView'
import { Table, Row } from './Table'
import { NetworkModel } from './Network'
import { VisualStyle } from './Style'

export interface NetworkSummary {
  uuid: string
  name: string
  iconUrl: string
  attributes: Row
  createdAt: string
  modifiedAt: string
}

export interface CurrentNetwork {
  network: NetworkModel
  nodeTable: Table
  edgeTable: Table
  networkView: NetworkView
  visualStyle: VisualStyle
  summary: NetworkSummary
}

export interface Workspace {
  name: string
  uuid: string
  networkSummaries: NetworkSummary[]
  currentNetworkUUID: string
}

// loads json and serliazes application models
export const serializeWorkspace = (workspaceJson: any): Workspace => {
  // for now just return the object
  // in the future, we need to parse BigInts etc.
  return workspaceJson
}

export const serializeCurrentNetwork = (
  currentNetworkJson: any,
): CurrentNetwork => {
  return currentNetworkJson
}
